using System.ComponentModel.DataAnnotations;

namespace ExpenseTracker.Models;

public class ChangePasswordViewModel
{
    [Required, DataType(DataType.Password), Display(Name = "Current password")]
    public string CurrentPassword { get; set; } = "";

    [Required, StringLength(100, MinimumLength = 8), DataType(DataType.Password), Display(Name = "New password")]
    public string NewPassword { get; set; } = "";

    [Compare(nameof(NewPassword)), DataType(DataType.Password), Display(Name = "Confirm new password")]
    public string ConfirmPassword { get; set; } = "";
}
