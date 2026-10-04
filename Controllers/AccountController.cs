using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExpenseTracker.Data;
using ExpenseTracker.Models;

namespace ExpenseTracker.Controllers;

[Route("[action]")]
public class AccountController(AppDbContext db) : Controller
{
    private static readonly PasswordHasher<User> Hasher = new();

    public IActionResult Login()
    {
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Login(LoginViewModel model, string? returnUrl)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == model.Email);
        if (user == null || Hasher.VerifyHashedPassword(user, user.PasswordHash, model.Password) == PasswordVerificationResult.Failed)
        {
            ModelState.AddModelError("", "Invalid email or password.");
            return View(model);
        }

        await SignInAsync(HttpContext, user, model.RememberMe);
        // IsLocalUrl rejects other sites (including //host and /\host tricks), so this can't be used as an open redirect.
        return Url.IsLocalUrl(returnUrl) ? Redirect(returnUrl) : RedirectToAction("Dashboard", "User");
    }

    public IActionResult Register()
    {
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Register(RegisterViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }
        if (await db.Users.AnyAsync(u => u.Email == model.Email))
        {
            ModelState.AddModelError(nameof(model.Email), "Email is already registered.");
            return View(model);
        }

        var user = new User { Name = model.Name, Email = model.Email };
        user.PasswordHash = Hasher.HashPassword(user, model.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        await SignInAsync(HttpContext, user);
        return RedirectToAction("Dashboard", "User");
    }

    [HttpPost]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync();
        return RedirectToAction("Index", "User");
    }

    // Also called after a profile edit, so the cookie picks up the new name.
    internal static Task SignInAsync(HttpContext http, User user, bool persistent = false)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name)
        };
        return http.SignInAsync(new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties { IsPersistent = persistent });
    }
}
