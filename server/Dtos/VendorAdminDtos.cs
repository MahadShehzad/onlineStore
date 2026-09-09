using System.ComponentModel.DataAnnotations;
using OnlineStore.Api.Models;

namespace OnlineStore.Api.Dtos;

// ---- vendor / store ----

public record VendorDto(
    string Id, string UserId, string OwnerName, string OwnerEmail,
    string StoreName, string StoreLogo, string StoreBanner, string Description,
    string Status, string RejectionReason, decimal CommissionRate,
    int ProductCount, DateTime CreatedAt);

public record StoreSettingsRequest(
    [Required] string StoreName,
    string? Description,
    string? StoreLogo,
    string? StoreBanner);

public record VendorDecisionRequest(string? Reason);

public record CommissionRequest([Range(0, 100)] decimal CommissionRate);

// ---- users (admin) ----

public record AdminUserDto(
    string Id, string Name, string Email, string Role, bool IsBlocked,
    DateTime CreatedAt, int OrderCount, string? VendorStatus);

public record BlockRequest(bool Blocked);

// ---- disputes ----

public record DisputeDto(
    string Id, string OrderId, string RaisedByUserId, string RaisedByName,
    string Subject, string Description, string Status, string Resolution,
    DateTime CreatedAt, DateTime? ResolvedAt);

public record DisputeCreateRequest(
    [Required] string OrderId,
    [Required, StringLength(160, MinimumLength = 3)] string Subject,
    [Required, StringLength(2000, MinimumLength = 5)] string Description);

public record DisputeResolveRequest(
    [Required] string Status,
    [Required] string Resolution);

// ---- settings ----

public record PlatformSettingDto(
    decimal DefaultCommissionRate, decimal ShippingFlatFee,
    string CurrencyCode, string CurrencySymbol);

public record PlatformSettingRequest(
    [Range(0, 100)] decimal DefaultCommissionRate,
    [Range(0, 100000)] decimal ShippingFlatFee);

// ---- analytics ----

public record TimeSeriesPoint(string Label, decimal Revenue, int Orders);

public record VendorAnalyticsDto(
    decimal TotalRevenue, int TotalOrders, int PendingOrders, int ProductCount,
    decimal CommissionPaid, TimeSeriesPoint[] Daily, TimeSeriesPoint[] Monthly,
    ProductSummaryDto[] TopProducts);

public record AdminAnalyticsDto(
    decimal Gmv, decimal CommissionEarned, int OrderCount, int CustomerCount,
    int VendorCount, int PendingVendorCount, int ProductCount, int OpenDisputeCount,
    TimeSeriesPoint[] Monthly, VendorLeaderRow[] TopVendors);

public record VendorLeaderRow(string VendorId, string StoreName, decimal Revenue, int Orders);

public static class VendorAdminMap
{
    public static VendorDto ToDto(this Vendor v, int productCount) =>
        new(v.Id, v.UserId, v.User?.Name ?? "", v.User?.Email ?? "",
            v.StoreName, v.StoreLogo, v.StoreBanner, v.Description,
            v.Status, v.RejectionReason, v.CommissionRate, productCount, v.CreatedAt);

    public static DisputeDto ToDto(this Dispute d, string raisedByName) =>
        new(d.Id, d.OrderId, d.RaisedByUserId, raisedByName, d.Subject, d.Description,
            d.Status, d.Resolution, d.CreatedAt, d.ResolvedAt);

    public static PlatformSettingDto ToDto(this PlatformSetting s) =>
        new(s.DefaultCommissionRate, s.ShippingFlatFee, s.CurrencyCode, s.CurrencySymbol);
}
