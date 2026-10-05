// Expense dialog (Overview, Expenses): any [data-expense] button opens it, filled from the button's data-* attributes.
// "New expense" buttons carry just an id of 0, today's date and the default payment mode.
document.addEventListener('click', e => {
    const dialog = document.getElementById('expense-dialog');
    const opener = e.target.closest('[data-expense]');
    if (!dialog || !opener) return;
    const form = dialog.querySelector('form');
    const d = opener.dataset;
    form.reset(); // also clears earlier validation messages: jquery.validate.unobtrusive listens for reset
    for (const name of ['Id', 'Title', 'Price', 'Category', 'Date', 'PaymentMode', 'Description']) {
        form.elements['Expense.' + name].value = d[name.toLowerCase()] ?? '';
    }
    const editing = d.id !== '0';
    dialog.querySelector('h2').textContent = editing ? 'Edit expense' : 'New expense';
    form.querySelector('[type=submit]').textContent = editing ? 'Save changes' : 'Add expense';
    dialog.showModal();
});

// A click on the backdrop closes the dialog (the form fills the dialog, so only the backdrop hits the dialog itself).
document.addEventListener('click', e => {
    if (e.target.id === 'expense-dialog') e.target.close();
});
