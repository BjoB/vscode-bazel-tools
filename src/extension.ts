import * as vscode from 'vscode';
import * as path from 'path';
import * as api from './api';

let compileCommandsGenerator: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
	compileCommandsGenerator = vscode.commands.registerCommand('vscode-bazel-tools.generateCompileCommands', async () => {
		let currentlyOpenTabFileDir = path.dirname(vscode.window.activeTextEditor?.document.uri.fsPath!);
		let customCompileCommandsTarget = vscode.workspace.getConfiguration("bazeltools");

		await api.generateCompileCommands(currentlyOpenTabFileDir, customCompileCommandsTarget.get("customCompileCommandsTarget")).then(() => {
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
