namespace OnlineStore.Api.Models;

/// <summary>User roles across the platform.</summary>
public static class Roles
{
    public const string Customer = "Customer";
    public const string Vendor = "Vendor";
    public const string Admin = "Admin";
}

/// <summary>Order lifecycle. One order = one vendor (the cart is split at checkout).</summary>
public static class OrderStatuses
{
    public const string Pending = "Pending";     // placed, awaiting vendor
    public const string Accepted = "Accepted";   // vendor accepted, preparing
    public const string Shipped = "Shipped";
    public const string Delivered = "Delivered";
    public const string Rejected = "Rejected";   // vendor declined
    public const string Cancelled = "Cancelled"; // customer cancelled while pending
}

public class AppUser
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = Roles.Customer;
    public bool IsBlocked { get; set; }
    public string Phone { get; set; } = "";
    public string AvatarUrl { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

/// <summary>A seller's store. Created on vendor registration, gated by admin approval.</summary>
public class Vendor
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string StoreName { get; set; } = "";
    public string StoreLogo { get; set; } = "";
    public string StoreBanner { get; set; } = "";
    public string Description { get; set; } = "";
    /// <summary>Pending | Approved | Rejected</summary>
    public string Status { get; set; } = "Pending";
    public string RejectionReason { get; set; } = "";
    /// <summary>Platform commission percentage applied to this vendor's sales.</summary>
    public decimal CommissionRate { get; set; } = 10m;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AppUser? User { get; set; }
}

public class Category
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Icon { get; set; } = "bi-tag";
    public string? ParentId { get; set; }
}

public class Product
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string VendorId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string CategoryId { get; set; } = "";
    public string Brand { get; set; } = "";
    /// <summary>Comma-separated image URLs (first = primary).</summary>
    public string ImagesCsv { get; set; } = "";
    public double Rating { get; set; }
    public int RatingCount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Vendor? Vendor { get; set; }
    public Category? Category { get; set; }
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}

/// <summary>A size/colour option for a product, with its own stock and optional price delta.</summary>
public class ProductVariant
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ProductId { get; set; } = "";
    /// <summary>e.g. "Size" or "Colour".</summary>
    public string Name { get; set; } = "";
    /// <summary>e.g. "M" or "Red".</summary>
    public string Value { get; set; } = "";
    public decimal PriceDelta { get; set; }
    public int Stock { get; set; }

    public Product? Product { get; set; }
}

public class CartItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
    public ProductVariant? Variant { get; set; }
}

public class WishlistItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
}

public class Order
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CustomerId { get; set; } = "";
    public string VendorId { get; set; } = "";
    public string Status { get; set; } = OrderStatuses.Pending;
    public decimal Subtotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Total { get; set; }
    public decimal CommissionRate { get; set; }
    public decimal CommissionAmount { get; set; }
    /// <summary>Serialized shipping address snapshot.</summary>
    public string ShippingAddressJson { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
    public string PaymentReference { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }

    public AppUser? Customer { get; set; }
    public Vendor? Vendor { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public class OrderItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OrderId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string ProductImage { get; set; } = "";
    public string VariantLabel { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }

    public Order? Order { get; set; }
}

public class Review
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ProductId { get; set; } = "";
    public string UserId { get; set; } = "";
    public string UserName { get; set; } = "";
    public string OrderId { get; set; } = "";
    public int Rating { get; set; }
    public string Comment { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Address
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Line1 { get; set; } = "";
    public string Line2 { get; set; } = "";
    public string City { get; set; } = "";
    public string State { get; set; } = "";
    public string PostalCode { get; set; } = "";
    public string Country { get; set; } = "";
    public bool IsDefault { get; set; }
}

/// <summary>A customer complaint tied to an order, worked by an admin.</summary>
public class Dispute
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OrderId { get; set; } = "";
    public string RaisedByUserId { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Description { get; set; } = "";
    /// <summary>Open | Resolved | Rejected</summary>
    public string Status { get; set; } = "Open";
    public string Resolution { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}

/// <summary>Single-row table (Id = "singleton") for platform-wide settings.</summary>
public class PlatformSetting
{
    public string Id { get; set; } = "singleton";
    public decimal DefaultCommissionRate { get; set; } = 10m;
    public decimal ShippingFlatFee { get; set; } = 200m;
    public string CurrencyCode { get; set; } = "PKR";
    public string CurrencySymbol { get; set; } = "Rs";
}

/// <summary>Opaque refresh token, hashed at rest, one row per issued token (rotation).</summary>
public class RefreshToken
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;

    public AppUser? User { get; set; }
}
