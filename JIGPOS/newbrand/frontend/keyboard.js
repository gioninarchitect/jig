// ── Origin POS On-Screen Keyboard ────────────────────────────────────────────
// Shows numpad for number inputs, QWERTY for text inputs.
// Disappears when tapping outside. Does not interfere with native inputs.

(function () {
    'use strict';

    let activeInput = null;
    let shifted = false;
    let kb = null;
    let backdrop = null;

    // Inputs that should NOT trigger the keyboard (already handled by device)
    const SKIP_SELECTORS = [
        '#cashReceived',           // payment modal — native numpad is fine
        '.otp-cell',               // OTP input
        'input[type="password"]',  // PIN fields
    ];

    const NUM_LAYOUT = [
        ['7', '8', '9'],
        ['4', '5', '6'],
        ['1', '2', '3'],
        ['.', '0', '⌫'],
        ['CLR', 'DONE'],
    ];

    const QWERTY_LAYOUT = [
        ['q','w','e','r','t','y','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l'],
        ['⇧','z','x','c','v','b','n','m','⌫'],
        ['SPACE', 'CLR', 'DONE'],
    ];

    // ── Build keyboard DOM ──────────────────────────────────────────────────
    function buildKeyboard() {
        if (document.getElementById('pos-keyboard')) return;

        backdrop = document.createElement('div');
        backdrop.id = 'pos-keyboard-backdrop';
        backdrop.addEventListener('pointerdown', hide);
        document.body.appendChild(backdrop);

        kb = document.createElement('div');
        kb.id = 'pos-keyboard';
        kb.innerHTML = `
            <div class="kb-handle"></div>
            <div class="kb-preview">
                <span class="kb-label" id="kb-label">Value</span>
                <span class="kb-value" id="kb-value"></span>
            </div>
            <div id="kb-keys"></div>
        `;
        document.body.appendChild(kb);

        // Prevent keyboard taps from closing itself
        kb.addEventListener('pointerdown', e => e.stopPropagation());
    }

    // ── Render key layout ───────────────────────────────────────────────────
    function renderLayout(layout) {
        const container = document.getElementById('kb-keys');
        container.innerHTML = '';
        layout.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'kb-row';
            row.forEach(key => {
                const btn = document.createElement('button');
                btn.className = 'kb-key';
                btn.type = 'button';

                if (key === '⌫') {
                    btn.className += ' key-del';
                    btn.innerHTML = '<i class="ph-backspace-fill"></i>';
                } else if (key === 'CLR') {
                    btn.className += ' key-clear';
                    btn.textContent = 'CLR';
                } else if (key === 'DONE') {
                    btn.className += ' key-done';
                    btn.textContent = 'DONE ✓';
                } else if (key === 'SPACE') {
                    btn.className += ' key-space';
                    btn.textContent = '________';
                } else if (key === '⇧') {
                    btn.className += ' key-shift';
                    btn.innerHTML = '<i class="ph-arrow-fat-up-fill"></i>';
                } else if (key === '.') {
                    btn.className += ' key-gold';
                    btn.textContent = '.';
                } else {
                    btn.textContent = key;
                }

                btn.addEventListener('pointerdown', e => {
                    e.preventDefault();
                    btn.classList.add('pressed');
                    setTimeout(() => btn.classList.remove('pressed'), 120);
                    handleKey(key);
                });

                rowEl.appendChild(btn);
            });
            container.appendChild(rowEl);
        });
    }

    // ── Handle key press ────────────────────────────────────────────────────
    function handleKey(key) {
        if (!activeInput) return;

        if (key === 'DONE') { hide(); activeInput.blur(); return; }
        if (key === 'CLR')  { setInputValue(''); return; }
        if (key === '⌫') {
            const v = activeInput.value;
            setInputValue(v.slice(0, -1));
            return;
        }
        if (key === '⇧') {
            shifted = !shifted;
            document.querySelector('.kb-key.key-shift')?.classList.toggle('active', shifted);
            // Rebuild layout with shifted chars
            renderLayout(QWERTY_LAYOUT.map(row =>
                row.map(k => (k.length === 1 && k !== '⇧') ? (shifted ? k.toUpperCase() : k) : k)
            ));
            return;
        }
        if (key === 'SPACE') { appendChar(' '); return; }

        const char = (shifted && key.length === 1) ? key.toUpperCase() : key;
        appendChar(char);
        if (shifted) {
            shifted = false;
            document.querySelector('.kb-key.key-shift')?.classList.remove('active');
        }
    }

    function appendChar(char) {
        if (!activeInput) return;
        const isNum = activeInput.type === 'number' || activeInput.inputMode === 'numeric' || activeInput.inputMode === 'decimal';
        // Don't allow two dots in number fields
        if (isNum && char === '.' && activeInput.value.includes('.')) return;
        // Max length guard
        const max = parseInt(activeInput.maxLength, 10);
        if (max > 0 && activeInput.value.length >= max) return;
        setInputValue(activeInput.value + char);
    }

    function setInputValue(val) {
        if (!activeInput) return;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(activeInput, val);
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        activeInput.dispatchEvent(new Event('change', { bubbles: true }));
        updatePreview();
    }

    function updatePreview() {
        const el = document.getElementById('kb-value');
        if (el && activeInput) el.textContent = activeInput.value || '';
    }

    // ── Show / Hide ─────────────────────────────────────────────────────────
    function show(input) {
        if (!kb) buildKeyboard();
        activeInput = input;

        const isNum = input.type === 'number'
            || input.inputMode === 'numeric'
            || input.inputMode === 'decimal'
            || /search|amount|float|cash|qty|quantity|price/i.test(input.id + input.name + input.placeholder);

        kb.className = isNum ? 'numpad' : 'qwerty';
        renderLayout(isNum ? NUM_LAYOUT : QWERTY_LAYOUT);

        const label = document.getElementById('kb-label');
        if (label) label.textContent = input.placeholder || input.name || 'Value';
        updatePreview();

        kb.classList.add('visible');
        backdrop.classList.add('visible');
    }

    function hide() {
        if (!kb) return;
        kb.classList.remove('visible');
        backdrop.classList.remove('visible');
        activeInput = null;
        shifted = false;
    }

    // ── Wire up all inputs ──────────────────────────────────────────────────
    function shouldSkip(input) {
        return SKIP_SELECTORS.some(sel => input.matches(sel))
            || input.type === 'password'
            || input.type === 'file'
            || input.type === 'checkbox'
            || input.type === 'radio'
            || input.closest('#pos-keyboard')
            || input.readOnly
            || input.disabled;
    }

    function init() {
        buildKeyboard();

        // Intercept focus on all inputs and textareas
        document.addEventListener('focusin', e => {
            const el = e.target;
            if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !shouldSkip(el)) {
                // Small delay so browser positions cursor first
                setTimeout(() => show(el), 50);
            }
        }, true);

        // Keyboard shortcut: Escape hides
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') hide();
        });
    }

    // Init after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
