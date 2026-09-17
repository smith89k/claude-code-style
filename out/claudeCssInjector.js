"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAUDE_EXTENSION_ID = exports.removeFromFile = exports.injectIntoFile = void 0;
exports.claudeCssPaths = claudeCssPaths;
const vscode = require("vscode");
const path = require("path");
var claudeCssFile_1 = require("./claudeCssFile");
Object.defineProperty(exports, "injectIntoFile", { enumerable: true, get: function () { return claudeCssFile_1.injectIntoFile; } });
Object.defineProperty(exports, "removeFromFile", { enumerable: true, get: function () { return claudeCssFile_1.removeFromFile; } });
exports.CLAUDE_EXTENSION_ID = 'anthropic.claude-code';
function claudeCssPaths() {
    const ext = vscode.extensions.getExtension(exports.CLAUDE_EXTENSION_ID);
    return ext ? [path.join(ext.extensionPath, 'webview', 'index.css')] : [];
}
//# sourceMappingURL=claudeCssInjector.js.map