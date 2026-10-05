namespace ExpenseTracker.Models;

// Count and Total cover every expense matching the filters, not just the page shown.
public record ExpensesViewModel(List<Expense> Expenses, Expense Expense, IReadOnlyList<string> Categories, DateOnly Month = default, int Page = 1, int PageCount = 1,
    int Count = 0, decimal Total = 0);
