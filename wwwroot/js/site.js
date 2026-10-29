// 1. Expense dialog (Overview, Expenses, Analytics, Calendar): any [data-expense] trigger opens it, filled from data-* attributes.
document.addEventListener('click', e => {
    const opener = e.target.closest('[data-expense]');
    if (!opener) return;
    const dialog = document.getElementById('expense-dialog');
    if (!dialog) {
        const bsModal = document.getElementById('expenseModal');
        if (bsModal && window.bootstrap) {
            e.preventDefault();
            bootstrap.Modal.getOrCreateInstance(bsModal).show(opener);
        }
        return;
    }
    e.preventDefault();
    const form = dialog.querySelector('form');
    const d = opener.dataset;
    form.reset();
    for (const name of ['Id', 'Title', 'Price', 'Category', 'Date', 'PaymentMode', 'Description']) {
        const field = form.elements['Expense.' + name];
        if (!field) continue;
        const val = d[name.toLowerCase()] ?? '';
        if (field.tagName === 'SELECT') {
            const opt = [...field.options].find(o => o.value.toLowerCase() === val.toLowerCase());
            field.value = opt ? opt.value : val;
        } else {
            field.value = val;
        }
    }
    const editing = d.id !== '0';
    dialog.querySelector('h2').textContent = editing ? 'Edit expense' : 'Add an expense';
    form.querySelector('[type=submit]').textContent = editing ? 'Save changes' : 'Save expense';
    document.getElementById('hist-dialog')?.close();
    document.getElementById('cat-dialog')?.close();
    dialog.showModal();
});

document.addEventListener('click', e => {
    if (e.target.id === 'expense-dialog' || e.target.id === 'hist-dialog' || e.target.id === 'cat-dialog') e.target.close();
});

// 6. Histogram / Category click -> opens modal showing filtered expenses
const donutWrap = document.querySelector('.an-donut-wrap');
if (donutWrap) {
    const tipCat = document.getElementById('an-pie-tip-cat');
    const tipPct = document.getElementById('an-pie-tip-pct');
    const tipTotal = document.getElementById('an-pie-tip-total');
    const items = donutWrap.querySelectorAll('[data-cat-open]');
    const setHover = el => {
        const name = el?.dataset.catOpen;
        donutWrap.classList.toggle('has-hover', !!name);
        items.forEach(n => n.classList.toggle('is-active', n.dataset.catOpen === name));
        if (name) {
            tipCat.textContent = name;
            tipPct.textContent = el.dataset.catPct;
            tipTotal.textContent = `${el.dataset.catTotal} · ${el.dataset.catCount}`;
        }
    };
    donutWrap.addEventListener('pointerover', e => setHover(e.target.closest('[data-cat-open]')));
    donutWrap.addEventListener('pointerleave', () => setHover(null));
}

document.addEventListener('click', e => {
    const cat = e.target.closest('[data-cat-open]');
    if (cat) {
        const dialog = document.getElementById('cat-dialog');
        if (!dialog) return;
        const name = cat.dataset.catOpen;
        dialog.querySelector('#cat-dialog-title').textContent = cat.dataset.catTitle;
        dialog.querySelectorAll('[data-cat-row]').forEach(r => r.style.display = r.dataset.catRow === name ? '' : 'none');
        dialog.showModal();
        return;
    }
    const bar = e.target.closest('[data-hist-title]');
    if (!bar) return;
    const dialog = document.getElementById('hist-dialog');
    if (!dialog) return;
    const from = Number(bar.dataset.from);
    const to = Number(bar.dataset.to);
    dialog.querySelector('#hist-dialog-title').textContent = bar.dataset.histTitle;
    let shown = 0;
    dialog.querySelectorAll('[data-hist-row]').forEach(row => {
        const day = Number(row.dataset.histRow);
        const match = day >= from && day <= to;
        row.style.display = match ? '' : 'none';
        if (match) shown++;
    });
    dialog.querySelector('#hist-empty').hidden = shown > 0;
    dialog.showModal();
});

// 2. Global keyboard shortcut: Cmd/Ctrl + K focuses the header search input.
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const search = document.getElementById('fd-global-search');
        if (search) {
            e.preventDefault();
            search.focus();
            search.select();
        }
    }
});

// 3. Mobile navigation drawer toggle
document.addEventListener('click', e => {
    const sidebar = document.getElementById('spendy-sidebar');
    const scrim = document.getElementById('spendy-scrim');
    if (!sidebar || !scrim) return;

    if (e.target.closest('#spendy-menu-btn')) {
        sidebar.classList.add('sidebar--open');
        scrim.hidden = false;
    } else if (e.target.closest('#spendy-scrim')) {
        sidebar.classList.remove('sidebar--open');
        scrim.hidden = true;
    }
});

// 4. Hero amount show/hide toggle
document.addEventListener('click', e => {
    const btn = e.target.closest('#spendy-balance-toggle');
    if (!btn) return;
    const valWrap = document.getElementById('spendy-balance-value');
    const wholeEl = document.getElementById('spendy-balance-whole');
    const useEl = document.getElementById('spendy-eye-icon');
    const visible = btn.dataset.visible !== 'false';
    const nextVisible = !visible;

    btn.dataset.visible = String(nextVisible);
    btn.setAttribute('aria-label', nextVisible ? 'Hide amount' : 'Show amount');
    if (valWrap) valWrap.classList.toggle('balance-value--hidden', !nextVisible);
    if (wholeEl) wholeEl.textContent = nextVisible ? (btn.dataset.whole || '₹0') : '₹••,•••';
    if (useEl) useEl.setAttribute('href', nextVisible ? '#i-eye' : '#i-eye-off');
});

// 5. Cashflow chart Week / Month segmented control
document.addEventListener('click', e => {
    const tab = e.target.closest('[data-cashflow-tab]');
    if (!tab) return;
    document.querySelectorAll('[data-cashflow-tab]').forEach(b => b.classList.toggle('segmented__active', b === tab));
    const isWeek = tab.dataset.cashflowTab === 'week';
    const monthChart = document.getElementById('spendy-chart-month');
    const weekChart = document.getElementById('spendy-chart-week');
    if (monthChart) monthChart.hidden = isWeek;
    if (weekChart) weekChart.hidden = !isWeek;
});

// 7. Custom Date Picker & Calendar for all input[type="date"] across the website
(() => {
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const valDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    const toIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const parseIso = s => {
        const m = typeof s === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
        if (!m) return null;
        const y = +m[1], mo = +m[2] - 1, d = +m[3], dt = new Date(y, mo, d);
        return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d ? dt : null;
    };
    const formatIso = s => {
        const d = parseIso(s);
        return d ? `${d.getDate()} ${SHORT[d.getMonth()]} ${d.getFullYear()}` : '';
    };

    let pop, grid, monthSel, yearSel, clearBtn, activeInput = null, activeBtn = null, viewYear = 2026, viewMonth = 0;

    function ensurePop() {
        if (pop) return pop;
        pop = document.createElement('div');
        pop.className = 'dp-pop';
        pop.hidden = true;
        pop.innerHTML = `
            <div class="dp-head">
                <div class="dp-selects">
                    <select class="dp-select" data-dp-month aria-label="Month">${MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('')}</select>
                    <select class="dp-select num" data-dp-year aria-label="Year"></select>
                </div>
                <div class="dp-nav">
                    <button type="button" class="dp-nav-btn" data-dp-dir="-1" aria-label="Previous month"><svg class="i" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
                    <button type="button" class="dp-nav-btn" data-dp-dir="1" aria-label="Next month"><svg class="i" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
                </div>
            </div>
            <div class="dp-dow">${DOW.map(d => `<span>${d}</span>`).join('')}</div>
            <div class="dp-grid"></div>
            <div class="dp-foot">
                <button type="button" class="dp-foot-btn" data-dp-action="clear">Clear</button>
                <button type="button" class="dp-foot-btn dp-foot-btn--today" data-dp-action="today">Today</button>
            </div>`;
        grid = pop.querySelector('.dp-grid');
        monthSel = pop.querySelector('[data-dp-month]');
        yearSel = pop.querySelector('[data-dp-year]');
        clearBtn = pop.querySelector('[data-dp-action="clear"]');

        pop.addEventListener('click', e => {
            e.stopPropagation();
            const nav = e.target.closest('[data-dp-dir]');
            if (nav) {
                const dt = new Date(viewYear, viewMonth + Number(nav.dataset.dpDir), 1);
                viewYear = dt.getFullYear();
                viewMonth = dt.getMonth();
                render();
                return;
            }
            const day = e.target.closest('[data-dp-date]');
            if (day && activeInput) {
                selectVal(day.dataset.dpDate);
                return;
            }
            const act = e.target.closest('[data-dp-action]');
            if (act && activeInput) {
                selectVal(act.dataset.dpAction === 'today' ? toIso(new Date()) : '');
            }
        });

        pop.addEventListener('change', e => {
            e.stopPropagation();
            if (e.target === monthSel || e.target === yearSel) {
                viewMonth = +monthSel.value;
                viewYear = +yearSel.value;
                render();
            }
        });
        return pop;
    }

    function selectVal(val) {
        if (!activeInput) return;
        activeInput.value = val;
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        activeInput.dispatchEvent(new Event('change', { bubbles: true }));
        closePop();
    }

    function render() {
        const curY = new Date().getFullYear();
        const minY = Math.min(curY - 10, viewYear - 5);
        const maxY = Math.max(curY + 5, viewYear + 5);
        let yHtml = '';
        for (let y = minY; y <= maxY; y++) yHtml += `<option value="${y}">${y}</option>`;
        yearSel.innerHTML = yHtml;
        monthSel.value = String(viewMonth);
        yearSel.value = String(viewYear);

        const first = new Date(viewYear, viewMonth, 1);
        const startOffset = (first.getDay() + 6) % 7;
        const start = new Date(viewYear, viewMonth, 1 - startOffset);
        const todayIso = toIso(new Date());
        const selIso = activeInput ? activeInput.value : '';

        let html = '';
        for (let i = 0; i < 42; i++) {
            const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            const iso = toIso(d);
            const cls = [
                'dp-day',
                d.getMonth() !== viewMonth ? 'is-out' : '',
                iso === todayIso ? 'is-today' : '',
                iso === selIso ? 'is-selected' : ''
            ].filter(Boolean).join(' ');
            html += `<button type="button" class="${cls}" data-dp-date="${iso}">${d.getDate()}</button>`;
        }
        grid.innerHTML = html;
    }

    function positionPop() {
        if (!pop || !activeBtn) return;
        pop.hidden = false;
        const r = activeBtn.getBoundingClientRect();
        const pw = pop.offsetWidth || 280;
        const ph = pop.offsetHeight || 310;
        const pad = 12;
        let top = r.bottom + 6;
        if (top + ph > window.innerHeight - pad && r.top - ph - 6 >= pad) top = r.top - ph - 6;
        let left = r.left;
        if (left + pw > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - pw - pad);
        pop.style.top = `${Math.max(pad, top)}px`;
        pop.style.left = `${Math.max(pad, left)}px`;
    }

    function closePop() {
        if (!pop || pop.hidden) return;
        pop.hidden = true;
        if (activeBtn) {
            activeBtn.classList.remove('is-open');
            activeBtn.setAttribute('aria-expanded', 'false');
        }
        activeInput = activeBtn = null;
    }

    function enhance(input) {
        if (input.dataset.dpEnhanced) return;
        input.dataset.dpEnhanced = '1';
        const initialVal = input.value;
        const isFormControl = input.classList.contains('form-control');
        input.type = 'hidden';

        const wrap = document.createElement('div');
        wrap.className = 'dp' + (isFormControl ? ' dp--control' : '');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dp-toggle';
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');
        if (input.getAttribute('aria-label')) btn.setAttribute('aria-label', input.getAttribute('aria-label'));

        const label = document.createElement('span');
        label.className = 'dp-label num';
        btn.innerHTML = `<svg class="i dp-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M8 2v4M16 2v4M3 9h18"/></svg>`;
        btn.prepend(label);

        input.parentNode.insertBefore(wrap, input);
        wrap.append(input, btn);

        const sync = () => {
            const txt = formatIso(input.value);
            label.textContent = txt || (input.getAttribute('placeholder') || 'Select date');
            label.classList.toggle('is-placeholder', !txt);
        };

        Object.defineProperty(input, 'value', {
            get() { return valDesc.get.call(this); },
            set(v) {
                valDesc.set.call(this, v);
                sync();
            }
        });

        input.form?.addEventListener('reset', () => {
            input.value = input.defaultValue || initialVal;
        });

        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (activeInput === input && pop && !pop.hidden) {
                closePop();
                return;
            }
            closePop();
            ensurePop();
            activeInput = input;
            activeBtn = btn;
            btn.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');

            const host = input.closest('dialog, .modal') || document.body;
            if (pop.parentNode !== host) host.appendChild(pop);

            const dt = parseIso(input.value) || new Date();
            viewYear = dt.getFullYear();
            viewMonth = dt.getMonth();
            clearBtn.hidden = input.required || input.hasAttribute('data-val-required');
            render();
            positionPop();
        });

        sync();
    }

    document.querySelectorAll('input[type="date"]').forEach(enhance);
    document.addEventListener('click', e => {
        if (pop && !pop.hidden && !e.target.closest('.dp-pop') && !e.target.closest('.dp-toggle')) closePop();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && pop && !pop.hidden) closePop();
    });
    document.addEventListener('close', closePop, true);
    document.addEventListener('hide.bs.modal', closePop);
    document.addEventListener('hide.bs.dropdown', closePop);
    window.addEventListener('resize', () => { if (pop && !pop.hidden) positionPop(); });
    window.addEventListener('scroll', () => { if (pop && !pop.hidden) positionPop(); }, true);
})();
