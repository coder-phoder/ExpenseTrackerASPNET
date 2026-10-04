using System.ComponentModel.DataAnnotations;

namespace ExpenseTracker.Models;

public class ProfileViewModel
{
    [Required, StringLength(100)]
    public string Name { get; set; } = "";

    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = "";
}
