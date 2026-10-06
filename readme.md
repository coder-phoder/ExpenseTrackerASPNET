<div align="center">

# 💸 Expense Tracker

**A clean, fast, personal finance tracker built with ASP.NET Core MVC.**
Log every rupee, see where it goes, and keep your data yours.

![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-MVC-5C2D91?style=for-the-badge&logo=dotnet&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

[Features](#-features) •
[Tech Stack](#-tech-stack) •
[Prerequisites](#-prerequisites) •
[Setup](#-setup--installation) •
[Running](#-running-the-app) •
[Testing](#-testing) •
[Deployment](#-deploying-to-render)

</div>

---

## ✨ Features

| | Feature | Details |
|---|---|---|
| 🔐 | **Accounts** | Register, login, logout, "remember me", change password, edit profile. Passwords are hashed and every form is CSRF-protected. |
| 📊 | **Dashboard** | This month's spend, recent expenses and a quick-add button. |
| 🧾 | **Expenses** | Add, edit and delete expenses (title, ₹ price, date, payment mode, category, notes). Search, sort, filter by date / mode / category, and paginate. |
| 🏷️ | **Categories** | Built-in categories (Food, Travel, Bills, …) plus any custom category you type. |
| 💳 | **Payment modes** | UPI, Debit card, Credit card, Net banking, Online, Cash. |
| 📅 | **Calendar** | Month view with daily totals; click a day to manage its expenses. |
| 📈 | **Analytics** | Summary cards, monthly and weekday trends, payment-mode split, largest expenses. |
| 📄 | **Export** | Download filtered expenses as CSV, or view a printable monthly statement. |
| 🛡️ | **Admin panel** | Users overview, a year-long activity heatmap, and spend by mode and category. |
| 🌗 | **Light / dark theme** | Remembered per browser. Responsive from 320px phones to wide desktops. |

> Every user sees and changes **only their own data**.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | ASP.NET Core MVC on .NET 10 |
| **ORM** | Entity Framework Core 9 + Pomelo MySQL provider |
| **Database** | MySQL 8 (local, or managed, e.g. [Aiven](https://aiven.io)) |
| **Auth** | Cookie authentication + `PasswordHasher` (no Identity tables) |
| **UI** | Razor views, Bootstrap 5, vanilla JS |
| **Hosting** | Docker → [Render](https://render.com) |

<details>
<summary><b>📁 Project structure</b></summary>

```
ExpenseTrackerASPNET/
├── Controllers/        # Account (auth), User (app pages), Admin
├── Data/               # AppDbContext
├── Migrations/         # EF Core migrations
├── Models/             # Entities + view models
├── Views/              # Razor views (Account, User, Admin, Shared)
├── wwwroot/            # CSS, JS, static libs
├── Program.cs          # App startup & middleware
├── Dockerfile          # Multi-stage build for deployment
└── ExpenseTracker.csproj
```

</details>

---

## 📋 Prerequisites

| Tool | Version | Check |
|---|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download) | **10.0+** | `dotnet --version` |
| [EF Core CLI](https://learn.microsoft.com/ef/core/cli/dotnet) | 9.0+ | `dotnet ef --version` |
| MySQL server | **8.0+** | local install, Docker, or a hosted DB |
| [Git](https://git-scm.com) | any | `git --version` |
| [Docker](https://www.docker.com) | *optional* | only for testing the container locally |

Install the EF Core CLI if you don't have it:

```bash
dotnet tool install --global dotnet-ef
```

---

## 🚀 Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/coder-phoder/ExpenseTrackerASPNET.git
cd ExpenseTrackerASPNET
```

### 2. Restore dependencies

```bash
dotnet restore
```

### 3. Create a database

Use any MySQL 8 instance. For a quick local one with Docker:

```bash
docker run -d --name expense-mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=devpassword \
  -e MYSQL_DATABASE=expensetracker \
  mysql:8
```

### 4. Configure secrets

Secrets are **never** committed. Locally they live in [.NET user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets):

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Server=localhost;Port=3306;Database=expensetracker;User=root;Password=devpassword;"
```

> 💡 For a hosted database such as Aiven, add `SslMode=Required;` to the connection string.

### 5. Configure the admin account *(optional)*

The admin isn't stored in the database. It is defined by an email and a **password hash** in configuration. Generate a hash (replace `YourStrongPassword`):

```bash
cat > hash.fsx <<'EOF'
#r "nuget: Microsoft.Extensions.Identity.Core"
printfn "%s" (Microsoft.AspNetCore.Identity.PasswordHasher<obj>().HashPassword(null, "YourStrongPassword"))
EOF
dotnet fsi hash.fsx && rm hash.fsx
```

Then store it:

```bash
dotnet user-secrets set "Admin:Email" "admin@example.com"
dotnet user-secrets set "Admin:PasswordHash" "<hash from above>"
```

### 6. Apply database migrations

```bash
dotnet ef database update
```

This creates the `Users` and `Expenses` tables. ✅

---

## ▶️ Running the App

**With hot reload** (recommended for development):

```bash
dotnet watch
```

**Without hot reload:**

```bash
dotnet run --launch-profile https
```

| Profile | URL |
|---|---|
| `http` | http://localhost:5160 |
| `https` | https://localhost:7295 |

> First time with HTTPS? Trust the dev certificate: `dotnet dev-certs https --trust`

**Then:**
1. Open the app and **Register** a new account. You'll land on your dashboard.
2. Log in with the admin email to reach **`/Admin`**.

---

## 🧪 Testing

> ⚠️ There is no automated test project yet. Integration tests are on the [roadmap](features.txt).

### Build check

```bash
dotnet build -warnaserror
```

### Check the Docker image

```bash
docker build -t expense-tracker .
docker run --rm -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection="Server=host.docker.internal;Port=3306;Database=expensetracker;User=root;Password=devpassword;" \
  expense-tracker
```

Open http://localhost:8080.

### Manual smoke test

- [ ] Register a user → redirected to the dashboard
- [ ] Add, edit and delete an expense → success banner each time
- [ ] Search / filter / sort / paginate the expenses list
- [ ] Calendar shows day totals; clicking a day opens its expenses
- [ ] Analytics charts render with data
- [ ] CSV export downloads; monthly statement opens
- [ ] Second user **cannot** see the first user's expenses
- [ ] Admin login opens `/Admin`; a normal user is redirected away from it
- [ ] Theme toggle persists after reload
- [ ] Unknown URL shows the friendly error page

---

## ☁️ Deploying to Render

Render runs the app from the included **`Dockerfile`**. Render doesn't offer managed MySQL, so use a hosted MySQL such as **[Aiven](https://aiven.io)** (it has a free tier).

### 1. Prepare the production database

Create a MySQL 8 database, then run the migrations against it **from your machine**. Migrations don't run on startup.

```bash
dotnet ef database update --connection \
  "Server=<host>;Port=<port>;Database=<db>;User=<user>;Password=<password>;SslMode=Required;"
```

### 2. Create the web service

1. Push your code to GitHub.
2. In the [Render dashboard](https://dashboard.render.com), click **New → Web Service**.
3. Connect your repository.
4. Use these settings:

| Setting | Value |
|---|---|
| **Language** | `Docker` |
| **Branch** | `main` |
| **Dockerfile Path** | `./Dockerfile` |
| **Instance Type** | Free (or higher) |

### 3. Set environment variables

Under **Environment**, add these variables. In environment variable names, `__` stands for the `:` used in config keys.

| Key | Value |
|---|---|
| `ConnectionStrings__DefaultConnection` | `Server=…;Port=…;Database=…;User=…;Password=…;SslMode=Required;` |
| `Admin__Email` | `admin@example.com` |
| `Admin__PasswordHash` | *hash generated in [step 5](#5-configure-the-admin-account-optional)* |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `PORT` | `8080` |

> The .NET 10 container listens on port **8080**. Setting `PORT=8080` tells Render where to send traffic. Render handles HTTPS at its edge.

### 4. Deploy 🎉

Click **Create Web Service**. Render builds the image and deploys it to `https://<your-service>.onrender.com`. Every push to `main` redeploys automatically.

> 💤 Free instances sleep after ~15 minutes without traffic, so the first request after that can take 30–60 seconds.

### Schema changes later

When you add a migration, apply it to production **before** (or right after) pushing:

```bash
dotnet ef migrations add <Name>
dotnet ef database update --connection "<production connection string>"
git push
```

---

## 🗺️ Roadmap

Planned features, ranked by difficulty and priority, are in [`features.txt`](features.txt). Next up: monthly budgets, income tracking, receipt attachments and automated tests.

---

<div align="center">

Made with ☕ and C# by **[Krish Parikh](https://github.com/coder-phoder)**

</div>
