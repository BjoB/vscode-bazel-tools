import * as vscode from 'vscode';

const gtestRegExp = new RegExp(/(TEST|TEST_F|TEST_P)\(([^,]+),\s*([^)]+)\)/, "gm");

export const parseTest = (text: string, events: {
    onTestCase(range: vscode.Range, testSuiteName: string, testCaseName: string): void;
}) => {
    const matchesWithLineNumbers: { match: string; lineNumber: number }[] = [];
    const matches = text.matchAll(gtestRegExp);

    for (const match of matches) {
        let matchStr = match[0];
        const matchStart = match.index;
        const newlinesBeforeMatch = text.substring(0, matchStart).split('\n').length - 1;
        const matchLineNumber = newlinesBeforeMatch;

        let testSuiteName = match[2];
        let testCaseName = match[3];
        if (testCaseName.match(/,/g)) {
            // try to merge in case of custom test macros with additional arguments
            testCaseName = testCaseName.replace(/(?:\r\n|\r|\n)/g, '').replace(/\/\//g, '').replace(/,/g, '_').replace(/\s/g, '');
        }

        const range = new vscode.Range(new vscode.Position(matchLineNumber, 0), new vscode.Position(matchLineNumber, match[0].length));
        events.onTestCase(range, testSuiteName, testCaseName);
    }
};
