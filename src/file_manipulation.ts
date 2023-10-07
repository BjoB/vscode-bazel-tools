import * as fs from 'fs';
import { logger } from './logging';

export async function replacePattern(pattern: string, replaceValue: string, file: fs.PathLike) : Promise<[string, string]> {
    return new Promise<[string, string]>((resolve, reject) => {
        const regexPattern = new RegExp(pattern, 'g');
        try {
            const fileData = fs.readFileSync(file);
            const data = fileData.toString();
            const modifiedData = data.replace(regexPattern, replaceValue);
            resolve([data, modifiedData]);
        } catch (error) {
            logger.error(error);
            reject(error);
        }
    });
}
