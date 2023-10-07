import * as path from 'path';
import * as vscode from 'vscode';
import * as api from '../../api';
import * as assert from 'assert';
import { log } from 'console';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	const bazelWorkspaceDir = path.resolve(__dirname, '../../../src/test/example_workspace');

	test('Basic generateCompileCommands test', () => {
		api.generateCompileCommands(bazelWorkspaceDir, undefined).then(() => {
			assert(true);
		}).catch((error) => {
			console.log(error);
			assert(false);
		});
	});
});
