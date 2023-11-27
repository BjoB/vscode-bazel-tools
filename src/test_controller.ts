import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import * as path from 'path';
import { parseTest } from './test_parser';
import { runCommand } from './commands';
import { logger } from './logging';
import { glob } from 'glob';

const textDecoder = new TextDecoder('utf-8');

enum ItemType {
    testFile,
    testCase
}
const testItemTypes = new WeakMap<vscode.TestItem, ItemType>();
const getType = (testItem: vscode.TestItem) => testItemTypes.get(testItem)!;

export const testCases = new WeakMap<vscode.TestItem, TestCase>();
export const bazelTestLabels = new WeakMap<vscode.TestItem, string>();

export const getContentFromFilesystem = async (uri: vscode.Uri) => {
    try {
        const rawContent = await vscode.workspace.fs.readFile(uri);
        return textDecoder.decode(rawContent);
    } catch (e) {
        logger.error(`Error providing tests for ${uri.fsPath}`, e);
        return '';
    }
};

export class Utils {
    private workspaceDirPath: string | undefined;

    constructor(
        private readonly controller: vscode.TestController,
        private readonly testDiscoverLabel: string,
    ) { }

    public async discoverAllTestsInWorkspace() {
        if (!vscode.workspace.workspaceFolders) {
            return []; // handle the case of no open folders
        }

        return Promise.all(
            vscode.workspace.workspaceFolders.map(async workspaceFolder => {
                this.workspaceDirPath = workspaceFolder.uri.fsPath;

                await glob("**/WORKSPACE*", { nodir: true, absolute: true, cwd: this.workspaceDirPath }).then((workspaceFiles) => {
                    this.workspaceDirPath = path.dirname(workspaceFiles[0]);
                    logger.info(`WORKSPACE file found in: ${this.workspaceDirPath}`);
                }).catch(() => {
                    logger.error(`No WORKSPACE file found in ${this.workspaceDirPath}`);
                });

                const bazelTestTargetsQuery = await runCommand("bazel", ["query", `kind(\"cc_test\", ${this.testDiscoverLabel})`], this.workspaceDirPath);

                if (bazelTestTargetsQuery.error) {
                    throw new Error(`bazel query failed:\n ${bazelTestTargetsQuery.error.message}`);
                }

                const bazelTestTargets = bazelTestTargetsQuery.stdout;

                for (const testTarget of bazelTestTargets) {
                    const bazelSrcsQuery = await runCommand("bazel", ["query", `labels(srcs, ${testTarget})`, "--output=location"], this.workspaceDirPath);
                    if (bazelSrcsQuery.error) {
                        throw new Error(`bazel query failed:\n ${bazelSrcsQuery.error.message}`);
                    }
                    const bazelSrcRe = new RegExp(`.*${testTarget}.*`); // assume main source file = test label + file ext.
                    const srcFileUriMatches = bazelSrcsQuery.stdout.filter(item => item.match(bazelSrcRe));
                    if (!srcFileUriMatches) {
                        logger.error(`No valid test src file found in ${bazelSrcsQuery.stdout}`);
                        continue;
                    }
                    const srcFileUri = vscode.Uri.file(srcFileUriMatches[0].match(/^(.*):1:1:.*/)[1]);
                    const testItem = this.getOrCreateFile(srcFileUri);
                    bazelTestLabels.set(testItem, testTarget);

                    await this.updateFromDisk(testItem);

                }

                // const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.cpp');
                // const watcher = vscode.workspace.createFileSystemWatcher(pattern);

                // // When files are created, make sure there's a corresponding "file" node in the tree
                // watcher.onDidCreate(uri => this.getOrCreateFile(uri));
                // watcher.onDidChange(uri => this.parseTestsInFileContents(this.getOrCreateFile(uri)));
                // watcher.onDidDelete(uri => this.controller.items.delete(uri.toString()));

                // for (const file of await vscode.workspace.findFiles(pattern)) {
                //     this.getOrCreateFile(file);
                // }
                // return watcher;
            })
        );
    }

    getOrCreateFile(uri: vscode.Uri) {
        const existing = this.controller.items.get(uri.toString());
        if (existing) {
            return existing;
        }

        const file = this.controller.createTestItem(uri.toString(), uri.path.split('/').pop()!, uri);
        this.controller.items.add(file);
        testItemTypes.set(file, ItemType.testFile);

        file.canResolveChildren = true;
        return file;
    }

    public async updateFromDocument(doc: vscode.TextDocument) {
        if (doc.uri.scheme === 'file' && doc.uri.path.endsWith('.cpp')) { // TODO: support .cc?
            const lowerCaseUri = vscode.Uri.file(doc.uri.fsPath.toLowerCase()); // workaround, bazel query yields lowercase src paths
            this.updateFromDisk(this.getOrCreateFile(lowerCaseUri));
        }
    }

    public async updateFromDisk(item: vscode.TestItem) {
        try {
            const content = await getContentFromFilesystem(item.uri!);
            item.error = undefined;
            this.updateFromContents(content, item.uri!, item);
        } catch (e) {
            item.error = (e as Error).stack;
        }
    }

    public updateFromContents(content: string, file: vscode.Uri, item: vscode.TestItem) {
        const ancestors = [{ item, children: [] as vscode.TestItem[] }];

        const ascend = (depth: number) => {
            while (ancestors.length > depth) {
                const finished = ancestors.pop()!;
                finished.item.children.replace(finished.children);
            }
        };

        parseTest(content, {
            onTestCase: (range, testSuiteName, testCaseName) => {
                const parent = ancestors[ancestors.length - 1];
                const data = new TestCase(testSuiteName, testCaseName, bazelTestLabels.get(item));
                const id = `${item.uri}/${data.getLabel()}`;
                const tcase = this.controller.createTestItem(id, data.getLabel(), item.uri);
                testCases.set(tcase, data);
                testItemTypes.set(tcase, ItemType.testCase);
                tcase.range = range;
                parent.children.push(tcase);
            },
        });

        ascend(0); // finish and assign children for all remaining items
    }

    async runHandler(
        shouldDebug: boolean,
        request: vscode.TestRunRequest,
        token: vscode.CancellationToken
    ) {
        const run = this.controller.createTestRun(request);
        const queue: vscode.TestItem[] = [];

        // Loop through all included tests, or all known tests, and add them to our queue
        if (request.include) {
            request.include.forEach(test => queue.push(test));
        } else {
            this.controller.items.forEach(test => queue.push(test));
        }

        // For every test that was queued, try to run it. Call run.passed() or run.failed().
        // The `TestMessage` can contain extra information, like a failing location or
        // a diff output. But here we'll just give it a textual message.
        while (queue.length > 0 && !token.isCancellationRequested) {
            const test = queue.pop()!;

            // Skip tests the user asked to exclude
            if (request.exclude?.includes(test)) {
                continue;
            }

            switch (getType(test)) {
                case ItemType.testFile:
                    // If we're running a file and don't know what it contains yet, parse it now
                    if (test.children.size === 0) {
                        await this.updateFromDisk(test);
                    }
                    break;
                case ItemType.testCase:
                    // Otherwise, just run the test case. Note that we don't need to manually
                    // set the state of parent tests; they'll be set automatically.
                    const start = Date.now();
                    try {
                        const testCase = testCases.get(test);
                        await testCase.run(test, request, run, this.workspaceDirPath);
                        run.passed(test, Date.now() - start);
                    } catch (e) {
                        run.failed(test, new vscode.TestMessage(e.message), Date.now() - start);
                    }
                    break;
            }

            test.children.forEach(test => queue.push(test));
        }
        run.end();
    }
}

export class TestCase {
    constructor(
        private readonly testSuiteName: string,
        private readonly testCaseName: string,
        private readonly bazelTargetLabel: string,
    ) { }

    getLabel() {
        return `${this.testSuiteName}_${this.testCaseName}`;
    }

    async run(item: vscode.TestItem, request: vscode.TestRunRequest, options: vscode.TestRun, directory: string): Promise<void> {
        const start = Date.now();
        const bazelTargetLabel = this.bazelTargetLabel;

        if (request.profile.kind === vscode.TestRunProfileKind.Debug) {
            const workspaceFolder = vscode.workspace.workspaceFolders[0]; // assuming only one workspace opened

            await runCommand("bazel", ["info", "output_path"], directory).then(async (cmdOutput) => {
                const bazelOutParentDir = cmdOutput.stdout.join().split('/').slice(0, -1).join('/');

                // Find exe file path
                await runCommand("bazel", [
                    "cquery",
                    "--output=starlark",
                    "--starlark:expr=target.files_to_run.executable.path",
                    `${bazelTargetLabel}`],
                    directory).then(async (cmdOutput) => {
                        const exePath = path.join(bazelOutParentDir, cmdOutput.stdout[0]);

                        let debugConfig: vscode.DebugConfiguration;

                        // Assume Visual Studio Debugger on Windows, gdb on Linux
                        if (process.platform === "win32") {
                            debugConfig = {
                                name: "Debug",
                                type: "cppvsdbg",
                                request: "launch",
                                program: `${exePath}`,
                                args: [`--gtest_filter=${this.testSuiteName}.${this.testCaseName}`],
                                stopAtEntry: false,
                            };
                        } else if (process.platform === "linux") {
                            debugConfig = {
                                name: "Debug",
                                type: "cppdbg",
                                request: "launch",
                                program: `${exePath}`,
                                args: [`--gtest_filter=${this.testSuiteName}.${this.testCaseName}`],
                                stopAtEntry: false,
                                cwd: `${directory}`,
                                miDebuggerPath: "/usr/bin/gdb",
                            };
                        }

                        vscode.debug.startDebugging(workspaceFolder, debugConfig);
                    });
            });
        } else {
            const testOutput = await runCommand("bazel", ["test", `${bazelTargetLabel}`,
                "--test_output=all", `--test_filter=${this.testSuiteName}.${this.testCaseName}`],
                directory
            );
            const duration = Date.now() - start;

            if (!testOutput.error) {
                options.passed(item, duration);
            } else {
                let message: vscode.TestMessage;
                message.message = testOutput.error.message; // TODO: actual/expected values could be provided
                message.location = new vscode.Location(item.uri!, item.range!);
                options.failed(item, message, duration);
            }
            options.appendOutput(testOutput.stdout.join('\r\n'));
        }
    }
}
