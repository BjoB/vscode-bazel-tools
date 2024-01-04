import * as vscode from 'vscode';
import * as path from 'path';
import * as api from './api';
import { logger } from './logging';
import { Utils } from './test_controller';
import { glob } from 'glob';

let extensionOutputChannel: vscode.OutputChannel | undefined;
let compileCommandsGenerator: vscode.Disposable | undefined;
let bazelTestCtrl: vscode.TestController | undefined;

const bazelTools = "vsc-bazel-tools";
const activeTestingSettingName = "activateTesting";
const testDiscoverLabelSettingName = "testDiscoverLabel";
const activeTestingSettingDefault = true;
let testingActivated = false;

export async function activate(context: vscode.ExtensionContext) {
	extensionOutputChannel = vscode.window.createOutputChannel(bazelTools);
	extensionOutputChannel.show();
	logger.attachTransport((logObj) => {
		extensionOutputChannel.appendLine(logObj['0'].toString());
	});

	const mainVsCodeWorkspaceDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
	const foundWorkspaceFiles = await glob("**/WORKSPACE*", { nodir: true, absolute: true, cwd: mainVsCodeWorkspaceDir });
	if (!foundWorkspaceFiles) {
		vscode.window.showErrorMessage("No valid WORKSPACE file found!");
		return;
	}

	// take the first match as default and prompt for selection in case of multiple matches
	let bazelWorkspaceDir = foundWorkspaceFiles[0];
	if (foundWorkspaceFiles.length > 1) {
		bazelWorkspaceDir = await vscode.window.showQuickPick(foundWorkspaceFiles, {
			placeHolder: 'Choose bazel workspace...',
			ignoreFocusOut: true,
		});
	}
	bazelWorkspaceDir = path.dirname(bazelWorkspaceDir);

	logger.info("Retrieving configuration.");
	const config = vscode.workspace.getConfiguration(bazelTools);

	compileCommandsGenerator = vscode.commands.registerCommand('vsc-bazel-tools.generateCompileCommands', async () => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: 'VSC Bazel Tools'
		}, async (progress) => {
			progress.report({ message: "Generating compile commands..." });

			await api.generateCompileCommands(bazelWorkspaceDir, config.get("customCompileCommandsTarget")).then(() => {
				logger.info(`Successfully generated compile commands!`);

				progress.report({
					message: "Successfully generated compile commands!"
				});
				//vscode.window.showInformationMessage(`Successfully generated compile commands!`);
			}).catch(
				error => {
					progress.report({ message: "Failed to generate compile commands!" });
					vscode.window.showErrorMessage(error.message);
				}
			);

			return new Promise<void>(resolve => {
				setTimeout(() => {
					resolve();
				}, 1000);
			});
		});
	});

	context.subscriptions.push(compileCommandsGenerator);

	// Set up testing API
	const toggleTestingFeature = async () => {
		if (!testingActivated) {
			bazelTestCtrl = vscode.tests.createTestController('bazelTestController', 'Unit tests');
			const utils = new Utils(bazelTestCtrl, vscode.workspace.getConfiguration(bazelTools).get(testDiscoverLabelSettingName));

			bazelTestCtrl.resolveHandler = async test => {
				if (!test) {
					await utils.discoverAllTestsInWorkspace(bazelWorkspaceDir);
				} else {
					await utils.updateFromDisk(test);
				}
			};

			bazelTestCtrl.refreshHandler = async () => {
				await utils.discoverAllTestsInWorkspace(bazelWorkspaceDir);
			};

			// When text documents are open, parse tests in them.
			vscode.workspace.onDidOpenTextDocument(utils.updateFromDocument);
			// We could also listen to document changes to re-parse unsaved changes:
			vscode.workspace.onDidChangeTextDocument(e => utils.updateFromDocument(e.document));

			// Run profiles
			const runProfile = bazelTestCtrl.createRunProfile(
				'Run',
				vscode.TestRunProfileKind.Run,
				(request, token) => {
					utils.runHandler(false, request, token);
				}
			);

			const debugProfile = bazelTestCtrl.createRunProfile(
				'Debug',
				vscode.TestRunProfileKind.Debug,
				(request, token) => {
					utils.runHandler(true, request, token);
				}
			);

			context.subscriptions.push(bazelTestCtrl);
			testingActivated = true;
			logger.info("Testing feature activated!");
		} else {
			bazelTestCtrl?.dispose();
			testingActivated = false;
			logger.info("Testing feature deactivated!");
		}
	};

	// activate/deactivate testing feature initially
	if (vscode.workspace.getConfiguration(bazelTools).get(activeTestingSettingName, activeTestingSettingDefault)) {
		await toggleTestingFeature();
	}

	// activate/deactivate testing feature on config change
	vscode.workspace.onDidChangeConfiguration(async e => {
		const activeTestingFlagChanged = e.affectsConfiguration(`vsc-bazel-tools.${activeTestingSettingName}`);
		const testDiscoverLabelChanged = e.affectsConfiguration(`vsc-bazel-tools.${testDiscoverLabelSettingName}`);
		const activeTestingSetting = vscode.workspace.getConfiguration(bazelTools).get(activeTestingSettingName, activeTestingSettingDefault);
		if (activeTestingFlagChanged && activeTestingSetting === true || testDiscoverLabelChanged) {
			if (testDiscoverLabelChanged) {
				bazelTestCtrl?.dispose();
				testingActivated = false; // trigger refresh
			}
			await toggleTestingFeature();
		}
	});
}

export function deactivate() {
	compileCommandsGenerator?.dispose();
	bazelTestCtrl?.dispose();
	testingActivated = false;
}
