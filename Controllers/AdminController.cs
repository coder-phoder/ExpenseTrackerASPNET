using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExpenseTracker.Data;
using ExpenseTracker.Models;

namespace ExpenseTracker.Controllers;

[Authorize(Roles = "Admin")]
public class AdminController(AppDbContext db) : Controller
{
    public async Task<IActionResult> Index()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        // 53 week columns ending with this week, each starting on Sunday like the calendar.
        var start = today.AddDays(-(int)today.DayOfWeek - 52 * 7);

        // Every count and sum runs as SQL: only aggregates reach the page, and password hashes never leave the database.
        var users = await db.Users
            .Select(u => new UserSummary(u.Id, u.Name, u.Email, u.Expenses.Count, u.Expenses.Sum(e => e.Price) ?? 0, u.Expenses.Max(e => (DateOnly?)e.Date)))
            .ToListAsync();
        var days = await db.Expenses
            .Where(e => e.Date >= start && e.Date <= today)
            .GroupBy(e => e.Date)
            .Select(g => new DayActivity(g.Key, g.Count(), g.Select(e => e.UserId).Distinct().Count(), g.Sum(e => e.Price) ?? 0))
            .ToDictionaryAsync(d => d.Date);
        var modes = await db.Expenses
            .GroupBy(e => e.PaymentMode)
            .Select(g => new Total<PaymentMode>(g.Key, g.Sum(e => e.Price) ?? 0))
            .ToListAsync();
        var categories = await db.Expenses
            .GroupBy(e => e.Category)
            .Select(g => new Total<string>(g.Key, g.Sum(e => e.Price) ?? 0))
            .ToListAsync();

        return View(new AdminOverview(today, start,
            [.. users.OrderByDescending(u => u.LastExpense).ThenBy(u => u.Name)],
            days, modes, [.. categories.OrderByDescending(c => c.Amount)]));
    }
}

public record UserSummary(int Id, string Name, string Email, int ExpenseCount, decimal TotalSpent, DateOnly? LastExpense);

public record DayActivity(DateOnly Date, int Expenses, int Users, decimal Amount);

public record Total<TKey>(TKey Key, decimal Amount);

public record AdminOverview(DateOnly Today, DateOnly Start, List<UserSummary> Users, Dictionary<DateOnly, DayActivity> Days,
    List<Total<PaymentMode>> Modes, List<Total<string>> Categories);
