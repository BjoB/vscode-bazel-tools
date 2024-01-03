import { runCommand } from './commands';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logging';
import { replacePattern, replacePatternViaStream } from './file_manipulation';
import { glob } from 'glob';
import * as fse from 'fs-extra';

export async function generateCompileCommands(directory: string, customCompileCommandsTarget: string | undefined) {
    const bazelWorkspaceOutput = await runCommand("bazel", ["info", "workspace"], directory);
    if (bazelWorkspaceOutput.error) {
        throw bazelWorkspaceOutput.error;
    }
    const bazelWorkspace = bazelWorkspaceOutput.stdout.join();
    const bazelRcFile = path.join(bazelWorkspace, "/.bazelrc");
    logger.info(`Expected .bazelrc file: ${bazelRcFile}`);

    // retrieve all bazel targets below subdir
    // const bazelTargetsOutput = await runCommand("bazel", ["query", "...:all"], directory);
    // logger.debug(`Found bazel targets: ${bazelTargetsOutput.stdout}`);

    let compileCommandsTarget = "@hedron_compile_commands//:refresh_all";
    if (customCompileCommandsTarget) {
        compileCommandsTarget = customCompileCommandsTarget;
    }

    try {
        await runCommand("bazel", ["query", compileCommandsTarget], directory);
    } catch {
        throw new Error(`Could not find bazel target ${compileCommandsTarget}!`);
    }

    const compileCommandsFile = path.join(bazelWorkspace, "compile_commands.json");

    // symlink_prefix is not supported by hedron_compile_commands, so we need to work around it:
    const bazelRcData = fs.readFileSync(bazelRcFile).toString();
    const symlinkMatches = bazelRcData.match(/.*--symlink_prefix=(.+)/);
    if (symlinkMatches) {
        const [, symlinkPrefix] = symlinkMatches;

        if (fse.existsSync(compileCommandsFile)) {
            fs.unlinkSync(compileCommandsFile);
        }

        let restoreRcFile = false;
        let oldRcFileContent = "";
        await replacePattern(".*--symlink_prefix.*\\n", "", bazelRcFile).then(([oldData, modifiedData]) => {
            oldRcFileContent = oldData;
            restoreRcFile = (oldData !== modifiedData);
        });

        logger.info("Generating compile commands...");
        await runCommand("bazel", ["run", compileCommandsTarget], directory).finally(() => {
            if (restoreRcFile) {
                logger.info("Restoring .bazelrc file...");
                fs.writeFileSync(bazelRcFile, oldRcFileContent, 'utf8');
            }
        });

        await replacePatternViaStream("bazel-out", `${symlinkPrefix}out`, compileCommandsFile).then(() => {
            logger.info(`Replaced 'bazel-out' in compile_commands.json with '${symlinkPrefix}out'`);
        });
    } else {
        logger.info("Generating compile commands...");
        await runCommand("bazel", ["run", compileCommandsTarget], directory);
    }

    // move "external" symlink out of WORKSPACE
    for (let prefix of ["\"", "I"]) {
        await replacePatternViaStream(`${prefix}external`, `${prefix}../external`, compileCommandsFile).then(() => {
            logger.info(`Replaced '${prefix}external' in compile_commands.json with '${prefix}../external'`);
        });
    }

    // clangd workaround, "-isystem" included headers are not properly detected by the language server
    await replacePatternViaStream("-isystem", "-I", compileCommandsFile).then(() => {
        logger.info(`Replaced '-isystem' in compile_commands.json with '-I'`);
    });

    const destinationExternal = path.join(bazelWorkspace, "/../external");
    if (fse.existsSync(destinationExternal)) {
        fse.removeSync(destinationExternal);
    }
    const externalDir = path.join(bazelWorkspace, "external");
    if (fse.existsSync(externalDir)) {
        fse.moveSync(externalDir, destinationExternal);
    }

    // rm generated bazel-* symlinks aside WORKSPACE
    if (symlinkMatches) {
        const bazelLinks = await glob(`${bazelWorkspace}/bazel-*`);
        bazelLinks.forEach(function (link) {
            fs.unlinkSync(link);
            logger.debug(`Unlinked ${link}`);
        });
    }
}
