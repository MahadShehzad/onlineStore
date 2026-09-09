using System.ComponentModel.DataAnnotations;
using OnlineStore.Api.Models;

namespace OnlineStore.Api.Dtos;

public record CartLineDto(
    string Id, string ProductId, string Name, string Image, string Slug,
    string VendorId, string StoreName,
    string? VariantId, string VariantLabel,
    decimal UnitPrice, int Quantity, int StockAvailable);

public record CartDto(IReadOnlyList<CartLineDto> Lines, decimal Subtotal, int Count);

public record AddToCartRequest(
    [Required] string ProductId,
    string? VariantId,
    [Range(1, 99)] int Quantity);

public record UpdateCartRequest([Range(1, 99)] int Quantity);

// ---- wishlist ----

public record WishlistToggleRequest([Required] string ProductId);

public static class CartMap
{
    public static CartLineDto ToDto(this CartItem c)
    {
        var basePrice = c.Product?.Price ?? 0m;
        var delta = c.Variant?.PriceDelta ?? 0m;
        var label = c.Variant is null ? "" : $"{c.Variant.Name}: {c.Variant.Value}";
        var stock = c.Variant?.Stock ?? c.Product?.Stock ?? 0;
        return new CartLineDto(
            c.Id, c.ProductId, c.Product?.Name ?? "", CatalogMap.Images(c.Product?.ImagesCsv ?? "").FirstOrDefault() ?? "",
            c.Product?.Slug ?? "", c.Product?.VendorId ?? "", c.Product?.Vendor?.StoreName ?? "",
            c.VariantId, label, basePrice + delta, c.Quantity, stock);
    }
}
