using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Models;

// Stored as int: append new modes at the end, never reorder.
public enum PaymentMode
{
    Online,
    Cash,
    [Display(Name = "UPI")]
    Upi,
    [Display(Name = "Debit card")]
    DebitCard,
    [Display(Name = "Credit card")]
    CreditCard,
    [Display(Name = "Net banking")]
    NetBanking
}

public static class PaymentModeExtensions
{
    public static string DisplayName(this PaymentMode mode) =>
        typeof(PaymentMode).GetField(mode.ToString())?.GetCustomAttribute<DisplayAttribute>()?.Name ?? mode.ToString();
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

    // Free text: the built-ins below are suggestions; anything else typed becomes a user-defined category.
    [Required, StringLength(50)]
    public string Category { get; set; } = "";

    public static readonly string[] DefaultCategories = ["Bills", "Entertainment", "Food", "Health", "Shopping", "Travel", "Other"];
}
