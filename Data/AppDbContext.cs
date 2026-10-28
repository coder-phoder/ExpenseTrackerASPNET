using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ExpenseTracker.Controllers;
using ExpenseTracker.Models;

namespace ExpenseTracker.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<Expense> Expenses { get; set; }

    public void EnsureDemoUser()
    {
        const string email = "test@test.com";
        var user = Users.FirstOrDefault(u => u.Email == email);
        if (user is null)
        {
            user = new User { Name = "test", Email = email };
            user.PasswordHash = AccountController.Hasher.HashPassword(user, "test123");
            Users.Add(user);
            SaveChanges();
        }
        else if (AccountController.Hasher.VerifyHashedPassword(user, user.PasswordHash, "test123") == PasswordVerificationResult.Failed)
        {
            user.PasswordHash = AccountController.Hasher.HashPassword(user, "test123");
            SaveChanges();
        }

        var existingCount = Expenses.Count(e => e.UserId == user.Id);
        if (existingCount >= 100)
        {
            return;
        }
        if (existingCount > 0)
        {
            Expenses.RemoveRange(Expenses.Where(e => e.UserId == user.Id));
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        var thisMonth = new DateOnly(today.Year, today.Month, 1);
        var prevMonth = thisMonth.AddMonths(-1);
        var prevDays = DateTime.DaysInMonth(prevMonth.Year, prevMonth.Month);

        DateOnly ClampThisMonth(int day) => thisMonth.AddDays(Math.Min(day, today.Day) - 1);
        DateOnly ClampMonth(DateOnly firstOfMonth, int day) =>
            firstOfMonth.AddDays(Math.Min(day, DateTime.DaysInMonth(firstOfMonth.Year, firstOfMonth.Month)) - 1);

        var items = new List<Expense>();
        void Add(DateOnly date, string title, string category, PaymentMode mode, decimal price, string desc) =>
            items.Add(new Expense
            {
                UserId = user.Id,
                Date = date,
                Title = title,
                Category = category,
                PaymentMode = mode,
                Price = price,
                Description = desc
            });

        // 1. Current month: curated rhythm with realistic spend spikes and calm zero-spend days
        (int Day, string Title, string Cat, PaymentMode Mode, decimal Price, string Desc)[] currentMonthSeed =
        [
            (1,  "Apartment rent",               "Bills",         PaymentMode.NetBanking, 16500m, "Monthly house rent via NEFT"),
            (1,  "Filter coffee & masala dosa",  "Food",          PaymentMode.Upi,          140m, "Morning breakfast at Darshini"),
            (2,  "Weekly fresh groceries",       "Food",          PaymentMode.Upi,         1180m, "Vegetables, paneer, milk and seasonal fruits"),
            (3,  "Electricity bill",             "Bills",         PaymentMode.Online,      1940m, "Monthly state power utility bill"),
            (5,  "Metro smartcard top-up",       "Travel",        PaymentMode.Upi,          500m, "Monthly metro commute recharge"),
            (6,  "Fiber broadband 300 Mbps",     "Bills",         PaymentMode.CreditCard,   999m, "Unlimited home Wi-Fi plan"),
            (8,  "Scooter petrol full tank",     "Travel",        PaymentMode.Upi,          620m, "Shell unleaded 5.5L"),
            (9,  "Hyderabadi biryani lunch",     "Food",          PaymentMode.Upi,          460m, "Friday team lunch"),
            (11, "Supermarket pantry restock",   "Food",          PaymentMode.DebitCard,   1640m, "Whole wheat atta, olive oil, coffee beans & oats"),
            (12, "IMAX weekend movie night",     "Entertainment", PaymentMode.CreditCard,   780m, "Two tickets and salted caramel popcorn"),
            (14, "Auto fare to railway station", "Travel",        PaymentMode.Cash,         135m, "Morning peak-hour rickshaw"),
            (15, "Gym & swimming club",          "Health",        PaymentMode.Online,      1500m, "Monthly fitness membership renewal"),
            (16, "Masala chai & samosas",        "Food",          PaymentMode.Cash,          80m, "Evening tea stall break"),
            (18, "Running trainers",             "Shopping",      PaymentMode.CreditCard,  3290m, "Lightweight road-running shoes"),
            (19, "Fresh fruits & coconut water", "Food",          PaymentMode.Cash,         240m, "Morning farmer's market"),
            (21, "Pharmacy & multivitamins",     "Health",        PaymentMode.Upi,          540m, "Omega-3 capsules and basic first-aid"),
            (22, "South Indian family dinner",   "Food",          PaymentMode.CreditCard,   920m, "Ghee roast dosa, idli platter and lime soda"),
            (24, "Hardcover sci-fi novel",       "Entertainment", PaymentMode.DebitCard,    599m, "Weekend bookstore pick"),
            (25, "Airport highway cab",          "Travel",        PaymentMode.Upi,          480m, "Late evening ride home"),
            (27, "Specialty pour-over & bake",   "Food",          PaymentMode.Upi,          340m, "Afternoon work session at roastery"),
            (28, "Organic greens & sourdough",   "Food",          PaymentMode.Upi,          890m, "Fresh produce, Greek yogurt and bread"),
            (28, "Tapri ginger chai",            "Food",          PaymentMode.Cash,          60m, "Late afternoon tea with friends")
        ];

        foreach (var s in currentMonthSeed)
        {
            Add(ClampThisMonth(s.Day), s.Title, s.Cat, s.Mode, s.Price, s.Desc);
        }

        // 2. Previous month: full month benchmark (~₹35,890) so the trajectory curve & savings delta shine
        (int Day, string Title, string Cat, PaymentMode Mode, decimal Price, string Desc)[] prevMonthSeed =
        [
            (1,  "Apartment rent",               "Bills",         PaymentMode.NetBanking, 16500m, "Monthly house rent via NEFT"),
            (2,  "Monthly grocery haul",         "Food",          PaymentMode.DebitCard,   2150m, "Staples, spices, pulses and dairy"),
            (4,  "Electricity bill",             "Bills",         PaymentMode.Online,      2280m, "Air-conditioning heavy month"),
            (5,  "Fiber broadband 300 Mbps",     "Bills",         PaymentMode.CreditCard,   999m, "Home internet bill"),
            (7,  "Scooter servicing & oil",      "Travel",        PaymentMode.Upi,         1450m, "Periodic maintenance and brake pads"),
            (9,  "Wood-fired pizza dinner",      "Food",          PaymentMode.CreditCard,  1120m, "Weekend dinner with friends"),
            (11, "Metro & bus pass recharge",    "Travel",        PaymentMode.Upi,          600m, "Transit card top-up"),
            (13, "Cotton oxford shirt",          "Shopping",      PaymentMode.CreditCard,  1890m, "Wardrobe refresh"),
            (15, "Gym & swimming club",          "Health",        PaymentMode.Online,      1500m, "Monthly fitness membership"),
            (17, "Weekly vegetables & fruits",   "Food",          PaymentMode.Cash,         640m, "Local mandi run"),
            (19, "Concert live stream pass",     "Entertainment", PaymentMode.Upi,          499m, "Indie music festival ticket"),
            (21, "Dental scaling checkup",       "Health",        PaymentMode.DebitCard,   1200m, "Routine 6-month clinic visit"),
            (23, "Petrol refill",                "Travel",        PaymentMode.Upi,          580m, "Full tank refill"),
            (25, "USB-C braided fast cable",     "Shopping",      PaymentMode.Online,       699m, "Desk setup accessory"),
            (26, "Supermarket weekend refill",   "Food",          PaymentMode.Upi,         1380m, "Groceries, snacks and cold brew"),
            (27, "Auto & cab rides",             "Travel",        PaymentMode.Cash,         310m, "City errands"),
            (28, "Mobile 5G prepaid pack",       "Bills",         PaymentMode.Upi,          449m, "28-day unlimited 5G plan"),
            (29, "Rooftop cafe dinner",          "Food",          PaymentMode.CreditCard,  1640m, "Month-end celebration dinner")
        ];

        foreach (var s in prevMonthSeed)
        {
            Add(ClampMonth(prevMonth, Math.Min(s.Day, prevDays)), s.Title, s.Cat, s.Mode, s.Price, s.Desc);
        }

        // 3. Months -2 to -11: 10 months of historical data for 12-month Analytics & Admin heatmap
        (int Day, string Title, string Cat, PaymentMode Mode, decimal BasePrice, string Desc)[] historyTemplate =
        [
            (1,  "Apartment rent",             "Bills",         PaymentMode.NetBanking, 16500m, "Monthly house rent"),
            (3,  "Electricity & water bill",   "Bills",         PaymentMode.Online,      1850m, "Monthly utility charges"),
            (6,  "Supermarket groceries",      "Food",          PaymentMode.Upi,         2400m, "Monthly kitchen essentials"),
            (10, "Commute & fuel",             "Travel",        PaymentMode.Upi,         1150m, "Metro card and scooter petrol"),
            (14, "Weekend dining & coffee",    "Food",          PaymentMode.CreditCard,  1350m, "Restaurants and cafe visits"),
            (18, "Fitness & pharmacy",         "Health",        PaymentMode.Online,      1650m, "Gym membership and essentials"),
            (22, "Apparel & home essentials",  "Shopping",      PaymentMode.CreditCard,  2200m, "Seasonal shopping"),
            (25, "Cinema & streaming",         "Entertainment", PaymentMode.Upi,          750m, "Movies, books and subscriptions"),
            (27, "Fresh market produce",       "Food",          PaymentMode.Cash,         680m, "Local vegetable and fruit market")
        ];

        decimal[] monthMultipliers = [0.96m, 1.08m, 0.92m, 1.15m, 1.04m, 0.89m, 1.12m, 0.95m, 1.06m, 0.98m];
        for (var m = 2; m <= 11; m++)
        {
            var monthStart = thisMonth.AddMonths(-m);
            var mult = monthMultipliers[m - 2];
            foreach (var h in historyTemplate)
            {
                var shiftedDay = ((h.Day + m * 2 - 1) % 27) + 1;
                var price = h.Cat == "Bills" && h.Day == 1
                    ? h.BasePrice
                    : Math.Round(h.BasePrice * mult / 10m) * 10m;
                Add(ClampMonth(monthStart, shiftedDay), h.Title, h.Cat, h.Mode, price, h.Desc);
            }
        }

        Expenses.AddRange(items);
        SaveChanges();
    }
}
