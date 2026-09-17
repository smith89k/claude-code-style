import * as fs from 'fs';
import { findScope, readBlock, removeBlock, replaceBlock } from './cssBlock';

export type InjectResult = 'written' | 'unchanged' | 'removed' | 'notFound';

async function readOrUndefined(file: string): Promise<string | undefined> {
    try {
        return await fs.promises.readFile(file, 'utf8');
    } catch {
        return undefined;
    }
}

// Write to a temp file first so Claude Code never loads a half-written stylesheet
async function writeAtomic(file: string, text: string): Promise<void> {
    const tmp = `${file}.ccs-tmp`;
    await fs.promises.writeFile(tmp, text, 'utf8');
    await fs.promises.rename(tmp, file);
}

export async function injectIntoFile(cssPath: string, buildBody: (scope: string) => string): Promise<InjectResult> {
    const css = await readOrUndefined(cssPath);
    if (css === undefined) {
        return 'notFound';
    }
    const next = replaceBlock(css, buildBody(findScope(css)));
    if (next === css || readBlock(next) === readBlock(css)) {
        return 'unchanged';
    }
    const backup = `${cssPath}.ccs-backup`;
    if (!fs.existsSync(backup)) {
        await fs.promises.writeFile(backup, removeBlock(css), 'utf8');
    }
    await writeAtomic(cssPath, next);
    return 'written';
}

export async function removeFromFile(cssPath: string): Promise<InjectResult> {
    const css = await readOrUndefined(cssPath);
    if (css === undefined) {
        return 'notFound';
    }
    const next = removeBlock(css);
    if (next === css) {
        return 'unchanged';
    }
    await writeAtomic(cssPath, next);
    return 'removed';
}
