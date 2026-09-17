"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.ELEMENT_KEYS = void 0;
exports.cleanFontName = cleanFontName;
exports.sanitizeConfig = sanitizeConfig;
exports.ELEMENT_KEYS = [
    'text', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'bold', 'italic', 'strike', 'link', 'code', 'codeBlock',
    'list', 'bullet', 'quote', 'tableHeader', 'tableCell', 'divider',
];
exports.DEFAULT_CONFIG = {
    englishFont: 'JetBrains Mono',
    englishSize: 14,
    khmerFont: 'Khmer OS System',
    khmerSize: 14,
    elements: {},
};
const WEIGHTS = new Set(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']);
const COLOR = /^#[0-9a-fA-F]{3,8}$/;
// Font names end up inside CSS strings and settings; keep only safe characters
function cleanFontName(name) {
    return name.replace(/[^A-Za-z0-9 _.\-]/g, '').trim();
}
function clampSize(value) {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (!Number.isFinite(n)) {
        return undefined;
    }
    return Math.min(100, Math.max(6, Math.round(n)));
}
function sanitizeElement(raw) {
    if (!raw || typeof raw !== 'object') {
        return undefined;
    }
    const r = raw;
    const out = {};
    if (typeof r.font === 'string' && cleanFontName(r.font)) {
        out.font = cleanFontName(r.font);
    }
    if (r.size !== undefined && r.size !== '') {
        const size = clampSize(r.size);
        if (size !== undefined) {
            out.size = size;
        }
    }
    for (const prop of ['color', 'background', 'border']) {
        const value = r[prop];
        if (typeof value === 'string' && COLOR.test(value)) {
            out[prop] = value;
        }
    }
    if (typeof r.weight === 'string' && WEIGHTS.has(r.weight)) {
        out.weight = r.weight;
    }
    if (typeof r.italic === 'boolean') {
        out.italic = r.italic;
    }
    if (typeof r.underline === 'boolean') {
        out.underline = r.underline;
    }
    return Object.keys(out).length ? out : undefined;
}
function sanitizeConfig(raw) {
    const r = (raw && typeof raw === 'object' ? raw : {});
    const elementsRaw = (r.elements && typeof r.elements === 'object' ? r.elements : {});
    const elements = {};
    for (const key of exports.ELEMENT_KEYS) {
        const style = sanitizeElement(elementsRaw[key]);
        if (style) {
            elements[key] = style;
        }
    }
    const font = (value, fallback) => (typeof value === 'string' && cleanFontName(value)) || fallback;
    return {
        englishFont: font(r.englishFont, exports.DEFAULT_CONFIG.englishFont),
        englishSize: clampSize(r.englishSize) ?? exports.DEFAULT_CONFIG.englishSize,
        khmerFont: font(r.khmerFont, exports.DEFAULT_CONFIG.khmerFont),
        khmerSize: clampSize(r.khmerSize) ?? exports.DEFAULT_CONFIG.khmerSize,
        elements,
    };
}
//# sourceMappingURL=styleConfig.js.map