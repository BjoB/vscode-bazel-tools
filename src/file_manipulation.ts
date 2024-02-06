import * as fs from 'fs';
import { logger } from './logging';
import * as fse from 'fs-extra';

// Resolves as [oldDatam modifiedData].
export async function replacePattern(pattern: string, replaceValue: string, file: fs.PathLike): Promise<[string, string]> {
    return new Promise<[string, string]>((resolve, reject) => {
        const regexPattern = new RegExp(pattern, 'g');
        try {
            const fileData = fs.readFileSync(file);
            const data = fileData.toString();
            const modifiedData = data.replace(regexPattern, replaceValue);
            fs.writeFileSync(file, modifiedData, 'utf8');
            resolve([data, modifiedData]);
        } catch (error) {
            logger.error(error);
            reject(error);
        }
    });
}

export async function replacePatternViaStream(pattern: string, replaceValue: string, file: fs.PathLike) {
    return new Promise<void>((resolve, reject) => {
        const regexPattern = new RegExp(pattern, 'g');
        try {
            if (!fse.existsSync(file)) {
                reject(new Error(`File ${file} not found!`));
            }
            const tempFile = file + ".temp";
            const inputStream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 16777216 });
            const outputStream = fs.createWriteStream(tempFile, { encoding: 'utf8', highWaterMark: 16777216 });

            let currentChunk = '';
            let previousChunk = '';

            inputStream.on('data', async (chunk) => {
                currentChunk = previousChunk + chunk;
                const lines = currentChunk.split(/\r?\n/);
                const fullLinesChunk = lines.slice(0, -1).join('\n');
                const modifiedData = fullLinesChunk.replace(regexPattern, replaceValue);
                outputStream.write(`${modifiedData}\n`);
                previousChunk = lines[lines.length - 1];
            });

            inputStream.on('end', async () => {
                if (previousChunk) { // process last part
                    const modifiedLine = previousChunk.replace(regexPattern, replaceValue);
                    outputStream.write(`${modifiedLine}\n`);
                }
                inputStream.close();
                outputStream.on('finish', async () => {
                    outputStream.close(async () => {
                        fs.unlinkSync(file);
                        fs.renameSync(tempFile, file);
                        resolve();
                    });
                });
                outputStream.end(); // emits 'finish'
            });
        } catch (error) {
            logger.error(error);
            reject(error);
        }
    });
}
