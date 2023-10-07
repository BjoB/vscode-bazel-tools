import * as fs from 'fs';
import { logger } from './logging';

// Resolves as [oldDatam modifiedData].
export async function replacePattern(pattern: string, replaceValue: string, file: fs.PathLike) : Promise<[string, string]> {
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
