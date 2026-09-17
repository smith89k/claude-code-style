import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { injectIntoFile, removeFromFile } from '../claudeCssFile';

const original = '.root_abc :is(p,li,h1,h2){unicode-bidi:plaintext}';

function tmpCss(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-'));
    const file = path.join(dir, 'index.css');
    fs.writeFileSync(file, original);
    return file;
}

test('inject writes scoped block, makes one backup, then reports unchanged', async () => {
    const file = tmpCss();
    assert.equal(await injectIntoFile(file, (scope) => `${scope} h1{color:red}`), 'written');
    assert.match(fs.readFileSync(file, 'utf8'), /\.root_abc h1\{color:red\}/);
    assert.equal(fs.readFileSync(file + '.ccs-backup', 'utf8'), original);
    assert.equal(await injectIntoFile(file, (scope) => `${scope} h1{color:red}`), 'unchanged');
    await injectIntoFile(file, (scope) => `${scope} h1{color:blue}`);
    assert.equal(fs.readFileSync(file + '.ccs-backup', 'utf8'), original);
});

test('remove restores the original text', async () => {
    const file = tmpCss();
    await injectIntoFile(file, () => 'x{}');
    assert.equal(await removeFromFile(file), 'removed');
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(await removeFromFile(file), 'unchanged');
});

test('missing file reports notFound', async () => {
    assert.equal(await injectIntoFile(path.join(os.tmpdir(), 'nope-ccs', 'index.css'), () => ''), 'notFound');
});
