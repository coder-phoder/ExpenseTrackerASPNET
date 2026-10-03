using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExpenseTracker.Data;
using ExpenseTracker.Models;

namespace ExpenseTracker.Controllers;

public class UserController(AppDbContext db) : Controller
{
    public IActionResult Index()
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            return RedirectToAction(nameof(Dashboard));
        }
        return View();
    }

    [Authorize]
    public IActionResult Dashboard()
    {
        return View();
    }

    [Authorize]
    public async Task<IActionResult> Profile()
    {
        return View(await db.Users.FindAsync(CurrentUserId));
    }

    [Authorize]
    public async Task<IActionResult> Expenses(int? edit)
    {
        var expense = edit == null
            ? new Expense { Date = DateOnly.FromDateTime(DateTime.Today) }
            : await db.Expenses.SingleOrDefaultAsync(e => e.Id == edit && e.UserId == CurrentUserId);
        if (expense == null)
        {
            return NotFound();
        }
        return await ExpensesView(expense);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Expenses(Expense expense)
    {
        if (expense.Id != 0 && !await db.Expenses.AnyAsync(e => e.Id == expense.Id && e.UserId == CurrentUserId))
        {
            return NotFound();
        }
        if (!ModelState.IsValid)
        {
            return await ExpensesView(expense);
        }

        expense.UserId = CurrentUserId;
        db.Update(expense);
        await db.SaveChangesAsync();
        return RedirectToAction(nameof(Expenses));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        await db.Expenses.Where(e => e.Id == id && e.UserId == CurrentUserId).ExecuteDeleteAsync();
        return RedirectToAction(nameof(Expenses));
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<IActionResult> ExpensesView(Expense expense)
    {
        var expenses = await db.Expenses
            .Where(e => e.UserId == CurrentUserId)
            .OrderByDescending(e => e.Date).ThenByDescending(e => e.Id)
            .ToListAsync();
        return View(nameof(Expenses), new ExpensesViewModel(expenses, expense));
    }
}
