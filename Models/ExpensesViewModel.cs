namespace ExpenseTracker.Models;

public record ExpensesViewModel(List<Expense> Expenses, Expense Expense, IReadOnlyList<string> Categories, DateOnly Month = default, int Page = 1, int PageCount = 1);
