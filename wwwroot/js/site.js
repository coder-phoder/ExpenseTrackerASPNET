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
    dialog.querySelector('h2').textContent = editing ? 'Edit expense' : 'New expense';
    form.querySelector('[type=submit]').textContent = editing ? 'Save changes' : 'Add expense';
    dialog.showModal();
});

document.addEventListener('click', e => {
    if (e.target.id === 'expense-dialog') e.target.close();
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

// 3. Dashboard period switcher (This month / Last month)
document.addEventListener('click', e => {
    const tab = e.target.closest('[data-period-tab]');
    if (!tab) return;
    document.querySelectorAll('[data-period-tab]').forEach(b => b.classList.toggle('is-active', b === tab));
    const spendEl = document.getElementById('fd-kpi-spend');
    const avgEl = document.getElementById('fd-kpi-avg');
    const txEl = document.getElementById('fd-kpi-tx');
    const subEl = document.getElementById('fd-period-subtitle');
    if (spendEl && tab.dataset.spend) spendEl.textContent = tab.dataset.spend;
    if (avgEl && tab.dataset.avg) avgEl.textContent = tab.dataset.avg;
    if (txEl && tab.dataset.tx) txEl.textContent = tab.dataset.tx;
    if (subEl && tab.dataset.sub) subEl.textContent = tab.dataset.sub;
});

// 4. Dashboard Spending Pulse window selector (Last 30 days / Last 7 days)
document.addEventListener('change', e => {
    if (e.target.id !== 'fd-pulse-select') return;
    const is7 = e.target.value === '7';
    const p30 = document.getElementById('fd-pulse-30');
    const p7 = document.getElementById('fd-pulse-7');
    const desc = document.getElementById('fd-pulse-desc');
    if (p30) p30.hidden = is7;
    if (p7) p7.hidden = !is7;
    if (desc) desc.textContent = is7
        ? 'Your daily outflow across the last 7 days'
        : 'Your daily outflow across the last 30 days';
});
