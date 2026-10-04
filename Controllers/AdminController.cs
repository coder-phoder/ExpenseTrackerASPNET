using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExpenseTracker.Data;

namespace ExpenseTracker.Controllers;

[Authorize(Roles = "Admin")]
public class AdminController(AppDbContext db) : Controller
{
    public async Task<IActionResult> Index()
    {
        // One query: the counts and sums run as SQL subqueries, and password hashes never leave the database.
        return View(await db.Users
            .OrderBy(u => u.Id)
            .Select(u => new UserSummary(u.Id, u.Name, u.Email, u.Expenses.Count, u.Expenses.Sum(e => e.Price) ?? 0, u.Expenses.Max(e => (DateOnly?)e.Date)))
            .ToListAsync());
    }
}

public record UserSummary(int Id, string Name, string Email, int ExpenseCount, decimal TotalSpent, DateOnly? LastExpense);
