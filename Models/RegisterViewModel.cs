using System.ComponentModel.DataAnnotations;

namespace ExpenseTracker.Models;

public class RegisterViewModel
{
    [Required(ErrorMessage = "Enter your name."), StringLength(100)]
    public string Name { get; set; } = "";

    [Required(ErrorMessage = "Enter your email."), EmailAddress(ErrorMessage = "Enter a valid email address."), StringLength(256)]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Choose a password."), StringLength(100, MinimumLength = 8, ErrorMessage = "Use at least 8 characters."), DataType(DataType.Password)]
    public string Password { get; set; } = "";

    [Required(ErrorMessage = "Enter your password again."), Compare(nameof(Password), ErrorMessage = "Passwords don't match."), DataType(DataType.Password), Display(Name = "Confirm password")]
    public string ConfirmPassword { get; set; } = "";
}
