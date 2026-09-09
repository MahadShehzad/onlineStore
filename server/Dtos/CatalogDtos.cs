using System.ComponentModel.DataAnnotations;
using OnlineStore.Api.Models;

namespace OnlineStore.Api.Dtos;

// ---- categories ----

public record CategoryDto(string Id, string Name, string Slug, string Icon, string? ParentId, int ProductCount);

public record CategoryUpsertRequest(
    [Required] string Name,
    string? Icon,
    string? ParentId);

// ---- products ----

public record ProductVariantDto(string Id, string Name, string Value, decimal PriceDelta, int Stock);

public record ProductVariantInput(string Name, string Value, decimal PriceDelta, int Stock);

public record ProductSummaryDto(
    string Id, string Name, string Slug, decimal Price, string[] Images,
    string Brand, string CategoryId, string CategoryName,
    string VendorId, string StoreName,
    double Rating, int RatingCount, int Stock, bool IsActive);

public record ProductDetailDto(
    string Id, string Name, string Slug, string Description, decimal Price, int Stock,
    string Brand, string[] Images,
    string CategoryId, string CategoryName,
    string VendorId, string StoreName, string StoreLogo,
    double Rating, int RatingCount, bool IsActive,
    ProductVariantDto[] Variants, DateTime CreatedAt);

public record ProductUpsertRequest(
    [Required, StringLength(160, MinimumLength = 2)] string Name,
    [Required] string Description,
    [Range(0, 100_000_000)] decimal Price,
    [Range(0, 1_000_000)] int Stock,
    [Required] string CategoryId,
    string? Brand,
    string[]? Images,
    bool IsActive,
    ProductVariantInput[]? Variants);

// ---- reviews ----

public record ReviewDto(string Id, string ProductId, string UserName, int Rating, string Comment, DateTime CreatedAt);

public record ReviewCreateRequest(
    [Required] string ProductId,
    [Range(1, 5)] int Rating,
    [Required, StringLength(1000, MinimumLength = 3)] string Comment);

public static class CatalogMap
{
    public static string[] Images(string csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? []
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static ProductSummaryDto ToSummary(this Product p) =>
        new(p.Id, p.Name, p.Slug, p.Price, Images(p.ImagesCsv), p.Brand,
            p.CategoryId, p.Category?.Name ?? "", p.VendorId, p.Vendor?.StoreName ?? "",
            Math.Round(p.Rating, 2), p.RatingCount, p.Stock, p.IsActive);

    public static ProductDetailDto ToDetail(this Product p) =>
        new(p.Id, p.Name, p.Slug, p.Description, p.Price, p.Stock, p.Brand, Images(p.ImagesCsv),
            p.CategoryId, p.Category?.Name ?? "", p.VendorId, p.Vendor?.StoreName ?? "",
            p.Vendor?.StoreLogo ?? "", Math.Round(p.Rating, 2), p.RatingCount, p.IsActive,
            p.Variants.Select(v => v.ToDto()).ToArray(), p.CreatedAt);

    public static ProductVariantDto ToDto(this ProductVariant v) =>
        new(v.Id, v.Name, v.Value, v.PriceDelta, v.Stock);

    public static ReviewDto ToDto(this Review r) =>
        new(r.Id, r.ProductId, r.UserName, r.Rating, r.Comment, r.CreatedAt);
}
