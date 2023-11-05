import * as vscode from 'vscode';

const gtestCaseRe = /(TEST|TEST_F|TEST_P)\(([^,]+),\s*([^)]+)\)/;

export const parseTest = (text: string, events: {
    onTestCase(range: vscode.Range, testSuiteName: string, testCaseName: string): void;
}) => {
    const lines = text.split('\n');

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = lines[lineNo];
        const gtest = gtestCaseRe.exec(line);
        if (gtest) { // TODO: so far only supports gtest -> add other test frameworks?
            const [, , testSuiteName, testCaseName] = gtest;
            const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, gtest[0].length));
            events.onTestCase(range, testSuiteName, testCaseName);
            continue;
        }
    }
};
