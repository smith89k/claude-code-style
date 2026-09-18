// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();
    const KEYS = ['text', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bold', 'italic', 'strike', 'link', 'code', 'codeBlock', 'list', 'bullet', 'quote', 'tableHeader', 'tableCell', 'divider', 'toolName', 'toolDescription', 'toolBox', 'toolLabel', 'toolContent'];
    // [name, text copied exactly from the preview panel]; a test checks the brackets
    const LABELS = {
        text: ['Normal text', 'This is normal text'],
        h1: ['Heading 1', ''],
        h2: ['Heading 2', ''],
        h3: ['Heading 3', ''],
        h4: ['Heading 4', ''],
        h5: ['Heading 5', ''],
        h6: ['Heading 6', ''],
        bold: ['Bold', 'bold · ដិត'],
        italic: ['Italic', 'italic · ទ្រេត'],
        strike: ['Crossed-out', 'crossed-out · លុបចោល'],
        link: ['Link', 'link · តំណភ្ជាប់'],
        code: ['Inline code', 'inline code'],
        codeBlock: ['Code block', 'function hello(name)'],
        list: ['List item', 'List item · ធាតុបញ្ជី'],
        bullet: ['Bullet / number', '•, 1., 2.'],
        quote: ['Quote', 'A quote from the docs'],
        tableHeader: ['Table header', 'Setting · ការកំណត់, Value'],
        tableCell: ['Table cell', 'English font, JetBrains Mono'],
        divider: ['Divider line', ''],
        toolName: ['Tool name', 'Bash'],
        toolDescription: ['Tool description', 'List source files'],
        toolBox: ['Tool box', ''],
        toolLabel: ['IN / OUT label', 'IN, OUT'],
        toolContent: ['IN / OUT content', 'ls src/, cssBuilder.ts'],
    };
    // Which boxes make sense for each row; the rest are disabled
    const NO_TEXT = ['divider', 'toolBox'];
    const NO_BACKGROUND = ['bullet', 'divider', 'toolName', 'toolDescription', 'toolLabel', 'toolContent'];
    const HAS_BORDER = ['code', 'codeBlock', 'quote', 'tableHeader', 'tableCell', 'divider', 'toolBox'];
    const WEIGHTS = ['', 'normal', '300', '400', '500', '600', 'bold', '800', '900'];
    const HEX6 = /^#[0-9a-f]{6}$/i;

    const $ = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));
    const tbody = /** @type {HTMLElement} */ (document.querySelector('#styles tbody'));

    function el(tag, attrs) {
        const node = document.createElement(tag);
        Object.assign(node, attrs || {});
        return node;
    }

    function wrap(child, disabled) {
        const td = el('td');
        if (disabled) {
            for (const input of child.matches('input, select') ? [child] : child.querySelectorAll('input, select')) {
                input.disabled = true;
            }
            td.className = 'off';
        }
        td.append(child);
        return td;
    }

    function colorCell(cls, disabled) {
        const cell = el('div', { className: 'color-cell' });
        const picker = el('input', { className: cls + '-picker', type: 'color', value: '#ffffff' });
        const text = el('input', { className: cls, type: 'text', placeholder: 'default' });
        picker.addEventListener('input', () => { text.value = picker.value; });
        text.addEventListener('input', () => { if (HEX6.test(text.value)) { picker.value = text.value; } });
        cell.append(picker, text);
        return wrap(cell, disabled);
    }

    function choice(cls, options, disabled) {
        const select = el('select', { className: cls });
        for (const [value, label] of options) {
            select.append(el('option', { value, textContent: label }));
        }
        return wrap(select, disabled);
    }

    const YES_NO = [['', 'default'], ['yes', 'yes'], ['no', 'no']];

    function buildRows() {
        for (const key of KEYS) {
            const noText = NO_TEXT.includes(key);
            const row = el('tr');
            row.dataset.key = key;
            const [name, brackets] = LABELS[key];
            const item = el('td', { textContent: name, className: 'item' });
            if (brackets) {
                item.append(' ', el('span', { className: 'example', textContent: '(' + brackets + ')' }));
            }
            row.append(item);

            const font = el('input', { className: 'f-font', placeholder: 'default' });
            font.setAttribute('list', 'allFonts');
            row.append(wrap(font, noText));
            row.append(wrap(el('input', { className: 'f-size', type: 'number', min: '6', max: '100', placeholder: '-' }), noText));
            row.append(colorCell('f-color', noText));
            row.append(colorCell('f-background', NO_BACKGROUND.includes(key)));
            row.append(colorCell('f-border', !HAS_BORDER.includes(key)));
            row.append(choice('f-weight', WEIGHTS.map((w) => [w, w || 'default']), noText));
            row.append(choice('f-italic', YES_NO, noText));
            row.append(choice('f-underline', YES_NO, noText));

            tbody.append(row);
        }
    }

    function field(row, cls) {
        return /** @type {HTMLInputElement} */ (row.querySelector('.' + cls));
    }

    function readForm() {
        const elements = {};
        for (const row of tbody.querySelectorAll('tr')) {
            const style = {};
            const value = (cls) => {
                const input = field(row, cls);
                return input.disabled ? '' : input.value.trim();
            };
            if (value('f-font')) { style.font = value('f-font'); }
            if (value('f-size')) { style.size = Number(value('f-size')); }
            for (const prop of ['color', 'background', 'border']) {
                if (value('f-' + prop)) { style[prop] = value('f-' + prop); }
            }
            if (value('f-weight')) { style.weight = value('f-weight'); }
            if (value('f-italic')) { style.italic = value('f-italic') === 'yes'; }
            if (value('f-underline')) { style.underline = value('f-underline') === 'yes'; }
            if (Object.keys(style).length) { elements[row.dataset.key] = style; }
        }
        return {
            englishFont: $('englishFont').value,
            englishSize: Number($('englishSize').value),
            khmerFont: $('khmerFont').value,
            khmerSize: Number($('khmerSize').value),
            elements,
        };
    }

    const yesNo = (flag) => (flag === undefined ? '' : flag ? 'yes' : 'no');

    const COLOR_PROPS = ['color', 'background', 'border'];

    function setColor(row, prop, value) {
        field(row, 'f-' + prop).value = value || '';
        field(row, 'f-' + prop + '-picker').value = HEX6.test(value || '') ? value : '#ffffff';
    }

    /** @type {{ id: string, label: string, group: string, elements: Record<string, Record<string, string>> }[]} */
    let presets = [];

    function fillPresets(list) {
        presets = list;
        const groups = { dark: el('optgroup', { label: 'Dark' }), light: el('optgroup', { label: 'Light' }) };
        for (const preset of list) {
            groups[preset.group].append(el('option', { value: preset.id, textContent: preset.label }));
        }
        $('preset').replaceChildren(el('option', { value: '', textContent: 'Choose a preset…' }), groups.dark, groups.light);
    }

    function applyPreset(id) {
        const preset = presets.find((p) => p.id === id);
        $('presetHint').textContent = preset && preset.group === 'light' ? 'For light editor themes' : '';
        if (!preset) {
            return;
        }
        for (const row of tbody.querySelectorAll('tr')) {
            const style = preset.elements[row.dataset.key] || {};
            for (const prop of COLOR_PROPS) {
                setColor(row, prop, style[prop]);
            }
        }
    }

    // Any manual edit means the boxes no longer match a preset
    function clearPreset(event) {
        if (event.target !== $('preset')) {
            $('preset').value = '';
            $('presetHint').textContent = '';
        }
    }

    function fillForm(config) {
        $('englishFont').value = config.englishFont;
        $('englishSize').value = String(config.englishSize);
        $('khmerFont').value = config.khmerFont;
        $('khmerSize').value = String(config.khmerSize);
        for (const row of tbody.querySelectorAll('tr')) {
            const style = config.elements[row.dataset.key] || {};
            field(row, 'f-font').value = style.font || '';
            field(row, 'f-size').value = style.size ? String(style.size) : '';
            for (const prop of COLOR_PROPS) {
                setColor(row, prop, style[prop]);
            }
            field(row, 'f-weight').value = style.weight || '';
            field(row, 'f-italic').value = yesNo(style.italic);
            field(row, 'f-underline').value = yesNo(style.underline);
        }
    }

    function fillList(id, names) {
        const list = /** @type {HTMLElement} */ (document.getElementById(id));
        list.replaceChildren(...names.map((name) => el('option', { value: name })));
    }

    let timer;
    function changed() {
        clearTimeout(timer);
        timer = setTimeout(() => vscode.postMessage({ type: 'preview', config: readForm() }), 150);
    }

    function setStatus(text, kind) {
        const status = $('status');
        status.textContent = text;
        status.className = kind || '';
    }

    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (msg.type === 'init') {
            fillList('allFonts', msg.fonts.all);
            fillList('khmerFonts', msg.fonts.khmer.length ? msg.fonts.khmer : msg.fonts.all);
            fillPresets(msg.presets || []);
            fillForm(msg.config);
            changed();
        } else if (msg.type === 'previewCss') {
            /** @type {HTMLElement} */ (document.getElementById('previewStyle')).textContent = msg.css;
            const preview = /** @type {HTMLElement} */ (document.getElementById('preview'));
            preview.style.setProperty('--pv-family', msg.family);
            preview.style.setProperty('--pv-size', msg.size + 'px');
        } else if (msg.type === 'status') {
            setStatus(msg.text, msg.kind);
        }
    });

    buildRows();
    // Registered before the body listeners so the boxes are filled before the preview is requested
    $('preset').addEventListener('change', () => applyPreset($('preset').value));
    document.body.addEventListener('input', clearPreset);
    document.body.addEventListener('change', clearPreset);
    document.body.addEventListener('input', changed);
    document.body.addEventListener('change', changed);
    $('apply').addEventListener('click', () => {
        setStatus('Saving…', '');
        vscode.postMessage({ type: 'apply', config: readForm() });
    });
    $('reset').addEventListener('click', () => {
        setStatus('Resetting…', '');
        vscode.postMessage({ type: 'reset' });
    });
    vscode.postMessage({ type: 'ready' });
})();
