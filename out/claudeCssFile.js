"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectIntoFile = injectIntoFile;
exports.removeFromFile = removeFromFile;
const fs = require("fs");
const cssBlock_1 = require("./cssBlock");
async function readOrUndefined(file) {
    try {
        return await fs.promises.readFile(file, 'utf8');
    }
    catch {
        return undefined;
    }
}
// Write to a temp file first so Claude Code never loads a half-written stylesheet
async function writeAtomic(file, text) {
    const tmp = `${file}.ccs-tmp`;
    await fs.promises.writeFile(tmp, text, 'utf8');
    await fs.promises.rename(tmp, file);
}
async function injectIntoFile(cssPath, buildBody) {
    const css = await readOrUndefined(cssPath);
    if (css === undefined) {
        return 'notFound';
    }
    const next = (0, cssBlock_1.replaceBlock)(css, buildBody((0, cssBlock_1.findScope)(css)));
    if (next === css || (0, cssBlock_1.readBlock)(next) === (0, cssBlock_1.readBlock)(css)) {
        return 'unchanged';
    }
    const backup = `${cssPath}.ccs-backup`;
    if (!fs.existsSync(backup)) {
        await fs.promises.writeFile(backup, (0, cssBlock_1.removeBlock)(css), 'utf8');
    }
    await writeAtomic(cssPath, next);
    return 'written';
}
async function removeFromFile(cssPath) {
    const css = await readOrUndefined(cssPath);
    if (css === undefined) {
        return 'notFound';
    }
    const next = (0, cssBlock_1.removeBlock)(css);
    if (next === css) {
        return 'unchanged';
    }
    await writeAtomic(cssPath, next);
    return 'removed';
}
//# sourceMappingURL=claudeCssFile.js.map