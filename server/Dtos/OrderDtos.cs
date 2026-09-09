using System.ComponentModel.DataAnnotations;
using OnlineStore.Api.Models;

namespace OnlineStore.Api.Dtos;

public record AddressDto(
    string Id, string FullName, string Phone, string Line1, string Line2,
    string City, string State, string PostalCode, string Country, bool IsDefault);

public record AddressUpsertRequest(
    [Required] string FullName,
    [Required] string Phone,
    [Required] string Line1,
    string? Line2,
    [Required] string City,
    [Required] string State,
    [Required] string PostalCode,
    [Required] string Country,
    bool IsDefault);

public record OrderItemDto(
    string Id, string ProductId, string ProductName, string ProductImage,
    string VariantLabel, decimal UnitPrice, int Quantity);

public record OrderDto(
    string Id, string Status, string CustomerId, string CustomerName,
    string VendorId, string StoreName,
    decimal Subtotal, decimal ShippingFee, decimal Total,
    decimal CommissionRate, decimal CommissionAmount,
    AddressDto? ShippingAddress, string PaymentMethod, string PaymentReference,
    DateTime CreatedAt, DateTime? AcceptedAt, DateTime? ShippedAt, DateTime? DeliveredAt,
    IReadOnlyList<OrderItemDto> Items);

public record CheckoutRequest(
    [Required] string AddressId,
    [Required] string PaymentMethod);

public record OrderStatusRequest([Required] string Status, string? Reason);

public static class OrderMap
{
    public static AddressDto ToDto(this Address a) =>
        new(a.Id, a.FullName, a.Phone, a.Line1, a.Line2, a.City, a.State, a.PostalCode, a.Country, a.IsDefault);

    public static OrderItemDto ToDto(this OrderItem i) =>
        new(i.Id, i.ProductId, i.ProductName, i.ProductImage, i.VariantLabel, i.UnitPrice, i.Quantity);

    public static OrderDto ToDto(this Order o)
    {
        AddressDto? addr = null;
        if (!string.IsNullOrWhiteSpace(o.ShippingAddressJson))
        {
            try { addr = System.Text.Json.JsonSerializer.Deserialize<AddressDto>(o.ShippingAddressJson); }
            catch { /* ignore malformed snapshot */ }
        }
        return new OrderDto(
            o.Id, o.Status, o.CustomerId, o.Customer?.Name ?? "",
            o.VendorId, o.Vendor?.StoreName ?? "",
            o.Subtotal, o.ShippingFee, o.Total, o.CommissionRate, o.CommissionAmount,
            addr, o.PaymentMethod, o.PaymentReference,
            o.CreatedAt, o.AcceptedAt, o.ShippedAt, o.DeliveredAt,
            o.Items.Select(i => i.ToDto()).ToList());
    }
}
