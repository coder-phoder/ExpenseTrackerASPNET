namespace ExpenseTracker.Models;

public record ExpensesViewModel(List<Expense> Expenses, Expense Expense, DateOnly Month = default);
