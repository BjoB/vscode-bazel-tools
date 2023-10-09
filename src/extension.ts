import * as vscode from 'vscode';
import * as path from 'path';
import * as api from './api';
import {logger} from './logging';

let extensionOutputChannel : vscode.OutputChannel | undefined;
let compileCommandsGenerator: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
	extensionOutputChannel = vscode.window.createOutputChannel("vsc-bazel-tools");
	extensionOutputChannel.show();
	logger.attachTransport((logObj) => { 
		extensionOutputChannel.appendLine(logObj['0'].toString());
	});

	compileCommandsGenerator = vscode.commands.registerCommand('vsc-bazel-tools.generateCompileCommands', async () => {
		let currentlyOpenTabFileDir = path.dirname(vscode.window.activeTextEditor?.document.uri.fsPath!);
		let customCompileCommandsTarget = vscode.workspace.getConfiguration("vsc-bazel-tools");

		await api.generateCompileCommands(currentlyOpenTabFileDir, customCompileCommandsTarget.get("customCompileCommandsTarget")).then(() => {
			logger.info(`Successfully generated compile commands!`);
			vscode.window.showInformationMessage(`Successfully generated compile commands!`);
		}
		).catch(
			error => {
				vscode.window.showErrorMessage(error);
			}
		);
	});

	context.subscriptions.push(compileCommandsGenerator);
}

export function deactivate() {
	compileCommandsGenerator?.dispose();
}
