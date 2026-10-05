// Expense form: a category chip fills in the category, and the chip matching what's typed lights up.
function syncChips(input) {
    const value = input.value.trim().toLowerCase();
    input.form.querySelectorAll('[data-category]').forEach(chip => chip.setAttribute('aria-pressed', chip.dataset.category.toLowerCase() === value));
}

document.addEventListener('click', e => {
    const chip = e.target.closest('[data-category]');
    if (!chip) return;
    const input = chip.form.elements['Expense.Category'];
    input.value = chip.dataset.category;
    syncChips(input);
    window.jQuery?.(input).valid?.(); // clears a "required" error left from an earlier submit
});

document.addEventListener('input', e => {
    if (e.target.name === 'Expense.Category') syncChips(e.target);
});
