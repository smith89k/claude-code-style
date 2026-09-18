export type ElementKey =
    | 'text' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'bold' | 'italic' | 'strike' | 'link' | 'code' | 'codeBlock'
    | 'list' | 'bullet' | 'quote' | 'tableHeader' | 'tableCell' | 'divider'
    | 'toolName' | 'toolDescription' | 'toolBox' | 'toolLabel' | 'toolContent';

export interface ElementStyle {
    font?: string;
    size?: number;
    color?: string;
    background?: string;
    border?: string;
    weight?: string;
    italic?: boolean;
    underline?: boolean;
}

export interface StyleConfig {
    englishFont: string;
    englishSize: number;
    khmerFont: string;
    khmerSize: number;
    elements: Partial<Record<ElementKey, ElementStyle>>;
}

export const ELEMENT_KEYS: ElementKey[] = [
    'text', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'bold', 'italic', 'strike', 'link', 'code', 'codeBlock',
    'list', 'bullet', 'quote', 'tableHeader', 'tableCell', 'divider',
    'toolName', 'toolDescription', 'toolBox', 'toolLabel', 'toolContent',
];

export const DEFAULT_CONFIG: StyleConfig = {
    englishFont: 'JetBrains Mono',
    englishSize: 14,
    khmerFont: 'Khmer OS System',
    khmerSize: 14,
    elements: {},
};

const WEIGHTS = new Set(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']);
const COLOR = /^#[0-9a-fA-F]{3,8}$/;

// Font names end up inside CSS strings and settings; keep only safe characters
export function cleanFontName(name: string): string {
    return name.replace(/[^A-Za-z0-9 _.\-]/g, '').trim();
}

function clampSize(value: unknown): number | undefined {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (!Number.isFinite(n)) {
        return undefined;
    }
    return Math.min(100, Math.max(6, Math.round(n)));
}

function sanitizeElement(raw: unknown): ElementStyle | undefined {
    if (!raw || typeof raw !== 'object') {
        return undefined;
    }
    const r = raw as Record<string, unknown>;
    const out: ElementStyle = {};
    if (typeof r.font === 'string' && cleanFontName(r.font)) {
        out.font = cleanFontName(r.font);
    }
    if (r.size !== undefined && r.size !== '') {
        const size = clampSize(r.size);
        if (size !== undefined) {
            out.size = size;
        }
    }
    for (const prop of ['color', 'background', 'border'] as const) {
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

export function sanitizeConfig(raw: unknown): StyleConfig {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const elementsRaw = (r.elements && typeof r.elements === 'object' ? r.elements : {}) as Record<string, unknown>;
    const elements: StyleConfig['elements'] = {};
    for (const key of ELEMENT_KEYS) {
        const style = sanitizeElement(elementsRaw[key]);
        if (style) {
            elements[key] = style;
        }
    }
    const font = (value: unknown, fallback: string) =>
        (typeof value === 'string' && cleanFontName(value)) || fallback;
    return {
        englishFont: font(r.englishFont, DEFAULT_CONFIG.englishFont),
        englishSize: clampSize(r.englishSize) ?? DEFAULT_CONFIG.englishSize,
        khmerFont: font(r.khmerFont, DEFAULT_CONFIG.khmerFont),
        khmerSize: clampSize(r.khmerSize) ?? DEFAULT_CONFIG.khmerSize,
        elements,
    };
}
