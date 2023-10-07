import { runCommand, CommandOutput } from './commands';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logging';
import { replacePattern } from './file_manipulation';
import { glob } from 'glob';
import * as fse from 'fs-extra';
import { error } from 'console';

export async function generateCompileCommands(directory: string, customCompileCommandsTarget: string | undefined) {
    const bazelWorkspaceOutput = await runCommand("bazel", ["info", "workspace"], directory);
    const bazelWorkspace = bazelWorkspaceOutput.stdout.join();
    const bazelRcFile = path.join(bazelWorkspace, "/.bazelrc");

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
    let bazelRcData = fs.readFileSync(bazelRcFile).toString();
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
            fs.writeFileSync(bazelRcFile, modifiedData, 'utf8');
            restoreRcFile = (oldData !== modifiedData);
        });

        await runCommand("bazel", ["run", compileCommandsTarget], directory).finally(() => {
            logger.info("Restoring .bazelrc file...");
            if (restoreRcFile) {
                fs.writeFileSync(bazelRcFile, oldRcFileContent, 'utf8');
            }
        });

        await replacePattern("bazel-out", `${symlinkPrefix}out`, compileCommandsFile);
    }

    // move "external" symlink out of WORKSPACE
    await replacePattern("external", "../external", compileCommandsFile);
    const destinationExternal = path.join(bazelWorkspace, "/../external");
    if (fse.existsSync(destinationExternal)) {
        fse.removeSync(destinationExternal);
    }
    fse.moveSync(path.join(bazelWorkspace, "external"), destinationExternal);

    // rm generated bazel-* symlinks aside WORKSPACE
    if (symlinkMatches) {
        const bazelLinks = await glob(`${bazelWorkspace}/bazel-*`);
        bazelLinks.forEach(function (link) {
            fs.unlinkSync(link);
            logger.debug(`Unlinked ${link}`);
        });
    }
}
