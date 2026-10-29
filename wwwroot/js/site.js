// 1. Expense dialog (Overview, Expenses): any [data-expense] trigger opens it, filled from data-* attributes.
document.addEventListener('click', e => {
    const opener = e.target.closest('[data-expense]');
    if (!opener) return;
    const dialog = document.getElementById('expense-dialog');
    if (!dialog) return;
    e.preventDefault();
    const form = dialog.querySelector('form');
    const d = opener.dataset;
    form.reset();
    for (const name of ['Id', 'Title', 'Price', 'Category', 'Date', 'PaymentMode', 'Description']) {
        const field = form.elements['Expense.' + name];
        if (field) field.value = d[name.toLowerCase()] ?? '';
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
