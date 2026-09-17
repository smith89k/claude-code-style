"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const claudeCssFile_1 = require("../claudeCssFile");
const original = '.root_abc :is(p,li,h1,h2){unicode-bidi:plaintext}';
function tmpCss() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-'));
    const file = path.join(dir, 'index.css');
    fs.writeFileSync(file, original);
    return file;
}
(0, node_test_1.test)('inject writes scoped block, makes one backup, then reports unchanged', async () => {
    const file = tmpCss();
    assert.equal(await (0, claudeCssFile_1.injectIntoFile)(file, (scope) => `${scope} h1{color:red}`), 'written');
    assert.match(fs.readFileSync(file, 'utf8'), /\.root_abc h1\{color:red\}/);
    assert.equal(fs.readFileSync(file + '.ccs-backup', 'utf8'), original);
    assert.equal(await (0, claudeCssFile_1.injectIntoFile)(file, (scope) => `${scope} h1{color:red}`), 'unchanged');
    await (0, claudeCssFile_1.injectIntoFile)(file, (scope) => `${scope} h1{color:blue}`);
    assert.equal(fs.readFileSync(file + '.ccs-backup', 'utf8'), original);
});
(0, node_test_1.test)('remove restores the original text', async () => {
    const file = tmpCss();
    await (0, claudeCssFile_1.injectIntoFile)(file, () => 'x{}');
    assert.equal(await (0, claudeCssFile_1.removeFromFile)(file), 'removed');
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(await (0, claudeCssFile_1.removeFromFile)(file), 'unchanged');
});
(0, node_test_1.test)('missing file reports notFound', async () => {
    assert.equal(await (0, claudeCssFile_1.injectIntoFile)(path.join(os.tmpdir(), 'nope-ccs', 'index.css'), () => ''), 'notFound');
});
//# sourceMappingURL=claudeCssInjector.test.js.map