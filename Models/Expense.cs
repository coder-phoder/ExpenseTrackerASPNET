using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Models;

public enum PaymentMode
{
    Online,
    Cash
}

public class Expense
{
    public int Id { get; set; }

    public int UserId { get; set; }

    [Required, StringLength(100)]
    public string Title { get; set; } = "";

    [StringLength(500)]
    public string? Description { get; set; }

    [Required, Range(0.01, 99999999.99), Precision(10, 2), Display(Name = "Price (₹)")]
    public decimal? Price { get; set; }

    [DataType(DataType.Date)]
    public DateOnly Date { get; set; }

    [Display(Name = "Mode of payment")]
    public PaymentMode PaymentMode { get; set; }
}
