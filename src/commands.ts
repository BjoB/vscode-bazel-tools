import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import { logger } from './logging';

export interface CliCallback {
    (): Promise<CommandOutput>;
}

export class CommandOutput {
    constructor(
        public command: string,
        public stdout: string[],
        public error?: Error,
    ) { }
}

export async function runCommand(cmd: string, args: string[], cwd: fs.PathLike): Promise<CommandOutput> {
    return new Promise<CommandOutput>((resolve, reject) => {
        let fullCmd = `${cmd} ${args.join(" ")}`;

        if (!fs.existsSync(cwd.toString())) {
            reject(new CommandOutput(fullCmd, [""], new Error(`Working directory ${cwd} does not exist.`)));
        }

        let options: child_process.SpawnOptions = {
            cwd: cwd.toString(),
            env: process.env,
            detached: false,
            shell: false,
            killSignal: "SIGTERM",
        };

        try {
            let proc = child_process.spawn(cmd, args, options);

            let cmdStdout: string = "";
            let cmdStderr: string = "";

            if (proc.stdout !== null) {
                proc.stdout.on('data', (data) => {
                    if (data !== undefined) {
                        cmdStdout += data.toString();
                    }
                });
            }

            if (proc.stderr !== null) {
                proc.stderr.on('data', (data) => {
                    if (data !== undefined) {
                        cmdStderr += data.toString();
                    }
                });
            }

            proc.on('error', (error) => {
                logger.error(error);
                reject(new CommandOutput(fullCmd, [""], error));
            });

            proc.on('exit', (code) => {
                if (code !== 0) {
                    logger.error(`${fullCmd} failed with exit code ${code} and stderr: ${cmdStderr}`);
                    reject(new CommandOutput(fullCmd, [""], new Error(`Command ${fullCmd} failed with exit code ${code}.`)));
                } else {
                    logger.info(`Successfully ran ${fullCmd}`);
                    resolve(new CommandOutput(fullCmd, cmdStdout.split(/\r\n|\r|\n/).filter(Boolean)));
                }
            });
        } catch (error) {
            logger.error(error);
            reject(new CommandOutput(fullCmd, [""], new Error(`Command ${cwd} failed with ${error}.`)));
        }
    });
}
