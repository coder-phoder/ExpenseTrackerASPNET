using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Models;

[Index(nameof(Email), IsUnique = true)]
public class User
{
    public int Id { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = "";

    [MaxLength(256)]
    public string Email { get; set; } = "";

    public string PasswordHash { get; set; } = "";

    public List<Expense> Expenses { get; set; } = [];
}
