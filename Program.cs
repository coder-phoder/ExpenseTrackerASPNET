using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExpenseTracker.Data;

// Load .env if present (maps __ to : automatically via ASP.NET Core environment variable configuration).
if (File.Exists(".env"))
{
    foreach (var line in File.ReadAllLines(".env"))
    {
        var trimmed = line.Trim();
        if (trimmed.Length == 0 || trimmed.StartsWith('#') || trimmed.IndexOf('=') is var eq && eq <= 0) continue;
        var key = trimmed[..eq].Trim();
        var val = trimmed[(eq + 1)..].Trim().Trim('"', '\'');
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, val);
        }
    }
}

// Convert a mysql://user:pass@host:port/db URI (e.g. from Aiven) into an ADO.NET connection string if needed.
static string NormalizeConnectionString(string? raw)
{
    if (string.IsNullOrWhiteSpace(raw) || !raw.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase))
    {
        return raw ?? "";
    }
    var uri = new Uri(raw);
    var userInfo = uri.UserInfo.Split(':', 2);
    var user = Uri.UnescapeDataString(userInfo[0]);
    var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var db = uri.AbsolutePath.Trim('/');
    return $"Server={uri.Host};Port={uri.Port};Database={db};User={user};Password={pass};SslMode=Required;";
}

var builder = WebApplication.CreateBuilder(args);
var connStr = NormalizeConnectionString(builder.Configuration.GetConnectionString("DefaultConnection"));

// Add services to the container.
builder.Services.AddControllersWithViews(options => options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()));
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connStr, new MySqlServerVersion(new Version(8, 0, 36))));
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login";
        // "/" sends the admin to /Admin and a user to their dashboard, so a forbidden page never loops.
        options.AccessDeniedPath = "/";
    });
// Plain [Authorize] means a signed-in user: the admin has no user id, so user pages are forbidden to it.
builder.Services.AddAuthorizationBuilder()
    .SetDefaultPolicy(new AuthorizationPolicyBuilder().RequireClaim(ClaimTypes.NameIdentifier).Build());

// Trust Render / reverse-proxy X-Forwarded-Proto & X-Forwarded-For headers so HTTPS cookies and CSRF tokens work.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// Auto-apply EF Core migrations and ensure the ideal demo account (test@test.com) exists on startup.
if (!string.IsNullOrWhiteSpace(connStr))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    db.EnsureDemoUser();
}

app.UseForwardedHeaders();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/User/Error");
    app.UseHsts();
}
// Empty 4xx/5xx responses (unknown URLs, NotFound()) render the friendly error page.
app.UseStatusCodePagesWithReExecute("/User/Error");

app.UseHttpsRedirection();
app.UseRequestLocalization("en-IN");
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=User}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
