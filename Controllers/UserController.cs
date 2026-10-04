using System.Globalization;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExpenseTracker.Data;
using ExpenseTracker.Models;

namespace ExpenseTracker.Controllers;

public class UserController(AppDbContext db, IConfiguration config) : Controller
{
    private const int PageSize = 20;

    public IActionResult Index()
    {
        if (User.IsInRole("Admin"))
        {
            return RedirectToAction("Index", "Admin");
        }
        if (User.Identity?.IsAuthenticated == true)
        {
            return RedirectToAction(nameof(Dashboard));
        }
        return View();
    }

    [Authorize]
    public async Task<IActionResult> Dashboard()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var first = new DateOnly(today.Year, today.Month, 1);
        var expenses = db.Expenses.Where(e => e.UserId == CurrentUserId);
        var monthTotal = await expenses.Where(e => e.Date >= first && e.Date < first.AddMonths(1)).SumAsync(e => e.Price) ?? 0;
        var recent = await expenses.OrderByDescending(e => e.Date).ThenByDescending(e => e.Id).Take(5).ToListAsync();
        return View((monthTotal, recent));
    }

    [Authorize]
    public async Task<IActionResult> Profile()
    {
        return ProfileView((await db.Users.FindAsync(CurrentUserId))!);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Profile(ProfileViewModel model)
    {
        var user = (await db.Users.FindAsync(CurrentUserId))!;
        if (ModelState.IsValid && (AccountController.IsAdminEmail(config, model.Email) || await db.Users.AnyAsync(u => u.Email == model.Email && u.Id != user.Id)))
        {
            ModelState.AddModelError(nameof(model.Email), "Email is already registered.");
        }
        if (!ModelState.IsValid)
        {
            // The page shows the saved values; the modal's inputs re-show what was typed (from ModelState) with the errors.
            return ProfileView(user);
        }

        user.Name = model.Name;
        user.Email = model.Email;
        await db.SaveChangesAsync();
        var persistent = (await HttpContext.AuthenticateAsync()).Properties?.IsPersistent == true;
        await AccountController.SignInAsync(HttpContext, user, persistent);
        TempData["Success"] = "Profile updated.";
        return RedirectToAction(nameof(Profile));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> ChangePassword(ChangePasswordViewModel model)
    {
        var user = (await db.Users.FindAsync(CurrentUserId))!;
        if (ModelState.IsValid && AccountController.Hasher.VerifyHashedPassword(user, user.PasswordHash, model.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            ModelState.AddModelError(nameof(model.CurrentPassword), "Current password is incorrect.");
        }
        if (!ModelState.IsValid)
        {
            return ProfileView(user);
        }

        user.PasswordHash = AccountController.Hasher.HashPassword(user, model.NewPassword);
        await db.SaveChangesAsync();
        TempData["Success"] = "Password changed.";
        return RedirectToAction(nameof(Profile));
    }

    [Authorize]
    public async Task<IActionResult> Analytics()
    {
        // ponytail: the view aggregates in memory; move to SQL GROUP BY if a user reaches ~100k expenses
        return View(await db.Expenses.Where(e => e.UserId == CurrentUserId).ToListAsync());
    }

    [Authorize]
    public async Task<IActionResult> Calendar(DateOnly? month, DateOnly? day)
    {
        var date = month ?? day ?? DateOnly.FromDateTime(DateTime.Today);
        var first = new DateOnly(date.Year, date.Month, 1);
        var expenses = await db.Expenses
            .Where(e => e.UserId == CurrentUserId && e.Date >= first && e.Date < first.AddMonths(1))
            .OrderBy(e => e.Id)
            .ToListAsync();
        return View(new ExpensesViewModel(expenses, new Expense(), await CategoriesAsync(), first));
    }

    [Authorize]
    public async Task<IActionResult> Expenses(int? edit, DateOnly? date, string? q, DateOnly? from, DateOnly? to, PaymentMode? mode, string? category, string? sort, int page = 1)
    {
        var expense = edit == null
            ? new Expense { Date = date ?? DateOnly.FromDateTime(DateTime.Today) }
            : await db.Expenses.SingleOrDefaultAsync(e => e.Id == edit && e.UserId == CurrentUserId);
        if (expense == null)
        {
            return NotFound();
        }
        return await ExpensesView(expense, q, from, to, mode, category, sort, page);
    }

    // Exports every row matching the list's filters and sort, not just the current page.
    [Authorize]
    public async Task<IActionResult> ExportCsv(string? q, DateOnly? from, DateOnly? to, PaymentMode? mode, string? category, string? sort)
    {
        // The BOM makes Excel read the file as UTF-8, so ₹ and non-English titles survive.
        var csv = new StringBuilder("\uFEFFDate,Title,Category,Description,Payment mode,Price\r\n");
        foreach (var e in await Filter(q, from, to, mode, category, sort).ToListAsync())
        {
            string[] fields = [e.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), e.Title, e.Category, e.Description ?? "", e.PaymentMode.DisplayName(), e.Price?.ToString(CultureInfo.InvariantCulture) ?? ""];
            csv.AppendJoin(',', fields.Select(CsvField)).Append("\r\n");
        }
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"expenses-{DateTime.Today:yyyy-MM-dd}.csv");
    }

    // A print-friendly page; the browser's "Save as PDF" turns it into the PDF statement.
    [Authorize]
    public async Task<IActionResult> Statement(DateOnly? month)
    {
        var date = month ?? DateOnly.FromDateTime(DateTime.Today);
        var first = new DateOnly(date.Year, date.Month, 1);
        var expenses = await db.Expenses
            .Where(e => e.UserId == CurrentUserId && e.Date >= first && e.Date < first.AddMonths(1))
            .OrderBy(e => e.Date).ThenBy(e => e.Id)
            .ToListAsync();
        return View((first, expenses));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Expenses(Expense expense, string? returnUrl)
    {
        if (expense.Id != 0 && !await db.Expenses.AnyAsync(e => e.Id == expense.Id && e.UserId == CurrentUserId))
        {
            return NotFound();
        }
        if (!ModelState.IsValid)
        {
            return await ExpensesView(expense);
        }

        // Reuse an existing spelling ("food" -> "Food") so one category never splits in two.
        var category = expense.Category.Trim();
        expense.Category = (await CategoriesAsync()).FirstOrDefault(c => c.Equals(category, StringComparison.OrdinalIgnoreCase)) ?? category;

        TempData["Success"] = expense.Id == 0 ? "Expense added." : "Expense updated.";
        expense.UserId = CurrentUserId;
        db.Update(expense);
        await db.SaveChangesAsync();
        return BackTo(returnUrl);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> DeleteExpense(int id, string? returnUrl)
    {
        if (await db.Expenses.Where(e => e.Id == id && e.UserId == CurrentUserId).ExecuteDeleteAsync() > 0)
        {
            TempData["Success"] = "Expense deleted.";
        }
        return BackTo(returnUrl);
    }

    // Re-executed with the failed request's method, so a failed POST must not trip the antiforgery check here.
    [IgnoreAntiforgeryToken]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View();
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private IActionResult ProfileView(User user) =>
        View(nameof(Profile), new ProfileViewModel { Name = user.Name, Email = user.Email });

    private IActionResult BackTo(string? returnUrl) =>
        Url.IsLocalUrl(returnUrl) ? Redirect(returnUrl) : RedirectToAction(nameof(Expenses));

    private async Task<List<string>> CategoriesAsync()
    {
        var used = await db.Expenses.Where(e => e.UserId == CurrentUserId).Select(e => e.Category).Distinct().ToListAsync();
        return Expense.DefaultCategories.Union(used, StringComparer.OrdinalIgnoreCase).Order().ToList();
    }

    // Quotes fields holding commas, quotes or line breaks; a leading ' stops Excel running user text as a formula.
    private static string CsvField(string s)
    {
        if (s.Length > 0 && "=+-@\t\r".Contains(s[0]))
        {
            s = "'" + s;
        }
        return s.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? $"\"{s.Replace("\"", "\"\"")}\"" : s;
    }

    private async Task<IActionResult> ExpensesView(Expense expense, string? q = null, DateOnly? from = null, DateOnly? to = null, PaymentMode? mode = null, string? category = null, string? sort = null, int page = 1)
    {
        var expenses = Filter(q, from, to, mode, category, sort);
        var pageCount = Math.Max(1, (await expenses.CountAsync() + PageSize - 1) / PageSize);
        page = Math.Clamp(page, 1, pageCount);
        var pageItems = await expenses.Skip((page - 1) * PageSize).Take(PageSize).ToListAsync();
        return View(nameof(Expenses), new ExpensesViewModel(pageItems, expense, await CategoriesAsync(), Page: page, PageCount: pageCount));
    }

    private IQueryable<Expense> Filter(string? q, DateOnly? from, DateOnly? to, PaymentMode? mode, string? category, string? sort)
    {
        var expenses = db.Expenses.Where(e => e.UserId == CurrentUserId);
        if (!string.IsNullOrWhiteSpace(q))
        {
            expenses = expenses.Where(e => e.Title.Contains(q.Trim()));
        }
        if (from != null)
        {
            expenses = expenses.Where(e => e.Date >= from.Value);
        }
        if (to != null)
        {
            expenses = expenses.Where(e => e.Date <= to.Value);
        }
        if (mode != null)
        {
            expenses = expenses.Where(e => e.PaymentMode == mode.Value);
        }
        if (!string.IsNullOrEmpty(category))
        {
            expenses = expenses.Where(e => e.Category == category);
        }
        return sort switch
        {
            "date_asc" => expenses.OrderBy(e => e.Date).ThenBy(e => e.Id),
            "price_desc" => expenses.OrderByDescending(e => e.Price).ThenByDescending(e => e.Id),
            "price_asc" => expenses.OrderBy(e => e.Price).ThenBy(e => e.Id),
            _ => expenses.OrderByDescending(e => e.Date).ThenByDescending(e => e.Id),
        };
    }
}
