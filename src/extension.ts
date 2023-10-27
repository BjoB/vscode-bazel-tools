import * as vscode from 'vscode';
import * as path from 'path';
import * as api from './api';
import { logger } from './logging';

let extensionOutputChannel: vscode.OutputChannel | undefined;
let compileCommandsGenerator: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
	extensionOutputChannel = vscode.window.createOutputChannel("vsc-bazel-tools");
	extensionOutputChannel.show();
	logger.attachTransport((logObj) => {
		extensionOutputChannel.appendLine(logObj['0'].toString());
	});

	compileCommandsGenerator = vscode.commands.registerCommand('vsc-bazel-tools.generateCompileCommands', async () => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: 'VSC Bazel Tools'
		}, async (progress) => {

			progress.report({ message: "Retrieving configuration..." });

			let currentlyOpenTabFileDir = path.dirname(vscode.window.activeTextEditor?.document.uri.fsPath!);
			let customCompileCommandsTarget = vscode.workspace.getConfiguration("vsc-bazel-tools");

			progress.report({ message: "Generating compile commands..." });

			await api.generateCompileCommands(currentlyOpenTabFileDir, customCompileCommandsTarget.get("customCompileCommandsTarget")).then(() => {
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
				}, 3000);
			});
		});
	});

	context.subscriptions.push(compileCommandsGenerator);
}

export function deactivate() {
	compileCommandsGenerator?.dispose();
}
