import * as fs from 'fs';
import { logger } from './logging';
import { CliCallback, CommandOutput } from './commands';

// Replaces a regex pattern with a given value. A callback can be specified, which is executed 
// after the modification and before the (optional) restore of the original file content.
export async function replacePattern(pattern: string, replaceValue: string, file: fs.PathLike,
    callback: CliCallback | undefined = undefined, restoreAfter: boolean = false) {
    const regexPattern = new RegExp(pattern, 'g');

    try {
        const fileData = fs.readFileSync(file);
        const data = fileData.toString();
        const modifiedData = data.replace(regexPattern, replaceValue);
        fs.writeFileSync(file, modifiedData, 'utf8'); // modify file
        if (callback !== undefined) {
            const cmdOutput = await callback();
            logger.info(`replacePattern callback returns: ${cmdOutput.stdout.toString()}`);
        }
        if (restoreAfter) {
            fs.writeFileSync(file, data, 'utf8'); // restore original content
        }
    } catch (err) {
        logger.error(err);
    }
}
