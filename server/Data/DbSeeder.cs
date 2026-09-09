using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Data;

/// <summary>
/// Idempotent startup seed. A fresh database gets the full demo dataset:
/// admin + customers, three approved vendors + one pending, a category tree,
/// ~24 products, and a handful of delivered orders with reviews so the
/// dashboards and charts render with real numbers.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (!await db.PlatformSettings.AnyAsync())
        {
            db.PlatformSettings.Add(new PlatformSetting());
            await db.SaveChangesAsync();
        }

        if (await db.Users.AnyAsync()) return; // already seeded

        // ---- categories ----
        var categories = new[]
        {
            new Category { Name = "Electronics", Slug = "electronics", Icon = "bi-cpu" },
            new Category { Name = "Fashion", Slug = "fashion", Icon = "bi-bag-heart" },
            new Category { Name = "Home & Living", Slug = "home-living", Icon = "bi-house-heart" },
            new Category { Name = "Beauty", Slug = "beauty", Icon = "bi-flower1" },
            new Category { Name = "Sports", Slug = "sports", Icon = "bi-bicycle" },
            new Category { Name = "Books", Slug = "books", Icon = "bi-book" },
        };
        db.Categories.AddRange(categories);

        // ---- users ----
        string Hash(string p) => BCrypt.Net.BCrypt.HashPassword(p);

        var admin = new AppUser { Name = "Platform Admin", Email = "admin@onlinestore.test", PasswordHash = Hash("Admin@123"), Role = Roles.Admin };
        var customer = new AppUser { Name = "Demo Customer", Email = "customer@onlinestore.test", PasswordHash = Hash("Customer@123"), Role = Roles.Customer, Phone = "0300-1112222" };
        var customer2 = new AppUser { Name = "Ayesha Khan", Email = "ayesha@onlinestore.test", PasswordHash = Hash("Customer@123"), Role = Roles.Customer };

        var vendorUser = new AppUser { Name = "Demo Vendor", Email = "vendor@onlinestore.test", PasswordHash = Hash("Vendor@123"), Role = Roles.Vendor };
        var vendorUser2 = new AppUser { Name = "Bilal Traders", Email = "bilal@onlinestore.test", PasswordHash = Hash("Vendor@123"), Role = Roles.Vendor };
        var vendorUser3 = new AppUser { Name = "Sana Boutique", Email = "sana@onlinestore.test", PasswordHash = Hash("Vendor@123"), Role = Roles.Vendor };
        var vendorUser4 = new AppUser { Name = "Pending Seller", Email = "pending@onlinestore.test", PasswordHash = Hash("Vendor@123"), Role = Roles.Vendor };

        db.Users.AddRange(admin, customer, customer2, vendorUser, vendorUser2, vendorUser3, vendorUser4);

        // ---- vendors ----
        var v1 = new Vendor { UserId = vendorUser.Id, StoreName = "TechNest", Description = "Gadgets, audio and accessories.", Status = "Approved", CommissionRate = 8m, StoreLogo = Img("technest-logo", 200), StoreBanner = Img("technest-banner", 1200, 300) };
        var v2 = new Vendor { UserId = vendorUser2.Id, StoreName = "Bilal Home", Description = "Everything for a cosy home.", Status = "Approved", CommissionRate = 10m, StoreLogo = Img("bilalhome-logo", 200), StoreBanner = Img("bilalhome-banner", 1200, 300) };
        var v3 = new Vendor { UserId = vendorUser3.Id, StoreName = "Sana Boutique", Description = "Hand-picked fashion & beauty.", Status = "Approved", CommissionRate = 12m, StoreLogo = Img("sana-logo", 200), StoreBanner = Img("sana-banner", 1200, 300) };
        var v4 = new Vendor { UserId = vendorUser4.Id, StoreName = "Pending Store", Description = "Awaiting review.", Status = "Pending", CommissionRate = 10m };
        db.Vendors.AddRange(v1, v2, v3, v4);

        // ---- products ----
        Category Cat(string slug) => categories.First(c => c.Slug == slug);
        var rng = new Random(42);
        Product P(Vendor v, string name, string cat, decimal price, int stock, string brand, string desc)
        {
            var seed = Slug.From(name);
            return new Product
            {
                VendorId = v.Id, Name = name, Slug = Slug.Unique(name), Description = desc,
                Price = price, Stock = stock, CategoryId = Cat(cat).Id, Brand = brand,
                ImagesCsv = string.Join(",", Img($"{seed}-1", 700), Img($"{seed}-2", 700), Img($"{seed}-3", 700)),
                Rating = 0, RatingCount = 0, IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 300)),
            };
        }

        var products = new List<Product>
        {
            P(v1, "Wireless Noise-Cancelling Headphones", "electronics", 18999m, 40, "SonicWave", "Over-ear headphones with 30-hour battery and active noise cancellation."),
            P(v1, "Mechanical Keyboard 75%", "electronics", 12499m, 25, "KeyForge", "Hot-swappable switches, PBT keycaps, USB-C and Bluetooth."),
            P(v1, "1080p Webcam", "electronics", 5999m, 60, "ClearView", "Full-HD webcam with auto light correction and dual mics."),
            P(v1, "20000mAh Power Bank", "electronics", 4499m, 100, "VoltGo", "Fast-charging power bank with USB-C PD and dual output."),
            P(v1, "Smartwatch Series 5", "electronics", 22999m, 30, "Pulse", "AMOLED display, heart-rate and SpO2, 7-day battery."),
            P(v1, "USB-C Hub 7-in-1", "electronics", 3999m, 80, "PortPlus", "HDMI 4K, SD card, 3x USB-A and 100W passthrough."),
            P(v1, "Bluetooth Speaker Mini", "electronics", 3499m, 70, "SonicWave", "Pocket speaker, IPX7 waterproof, 12-hour playback."),
            P(v1, "Gaming Mouse Lightweight", "electronics", 4999m, 45, "KeyForge", "58g honeycomb shell, 26K sensor, PTFE feet."),

            P(v2, "Ceramic Table Lamp", "home-living", 6999m, 20, "Lumen", "Hand-glazed ceramic base with linen shade."),
            P(v2, "Cotton Bed Sheet Set", "home-living", 8999m, 35, "SoftNest", "300 thread-count, king size, 4-piece set."),
            P(v2, "Cast Iron Skillet 10\"", "home-living", 5499m, 50, "Hearth", "Pre-seasoned, oven safe to 260°C."),
            P(v2, "Scented Soy Candle", "home-living", 1999m, 120, "Aura", "45-hour burn, sandalwood and vanilla."),
            P(v2, "Bamboo Storage Basket", "home-living", 2999m, 60, "SoftNest", "Foldable woven basket with handles."),
            P(v2, "Wall Clock Minimalist", "home-living", 3499m, 40, "Hearth", "Silent sweep movement, 30cm walnut frame."),
            P(v2, "Throw Blanket Knit", "home-living", 4499m, 30, "SoftNest", "Chunky knit, 130x170cm, machine washable."),
            P(v2, "Desk Organizer Set", "home-living", 2499m, 55, "Lumen", "Felt and wood tray set for a tidy desk."),

            P(v3, "Linen Blend Shirt", "fashion", 4999m, 40, "Thread&Co", "Breathable linen-cotton blend, relaxed fit."),
            P(v3, "Leather Crossbody Bag", "fashion", 8999m, 22, "Carrywell", "Full-grain leather, adjustable strap."),
            P(v3, "Classic Denim Jacket", "fashion", 7499m, 28, "Thread&Co", "Mid-wash, structured fit, metal buttons."),
            P(v3, "Hydrating Face Serum", "beauty", 3999m, 90, "GlowLab", "Hyaluronic acid + vitamin B5, fragrance-free."),
            P(v3, "Matte Lipstick Trio", "beauty", 2999m, 75, "GlowLab", "Long-wear, three everyday nudes."),
            P(v3, "Running Shoes Feather", "sports", 11999m, 35, "StrideX", "Energy-return foam, breathable knit upper."),
            P(v3, "Yoga Mat 6mm", "sports", 3499m, 60, "StrideX", "Non-slip TPE, carry strap included."),
            P(v3, "The Design of Everyday Things", "books", 1799m, 100, "MIT Press", "Don Norman's classic on usability and design."),
        };

        // fashion + apparel get size variants
        foreach (var p in products.Where(p => p.CategoryId == Cat("fashion").Id || p.CategoryId == Cat("sports").Id))
        {
            foreach (var size in new[] { "S", "M", "L", "XL" })
                p.Variants.Add(new ProductVariant { ProductId = p.Id, Name = "Size", Value = size, PriceDelta = 0, Stock = rng.Next(4, 15) });
        }

        db.Products.AddRange(products);

        // ---- addresses ----
        var address = new Address
        {
            UserId = customer.Id, FullName = "Demo Customer", Phone = "0300-1112222",
            Line1 = "12-B, Gulberg III", Line2 = "Near Main Boulevard", City = "Lahore",
            State = "Punjab", PostalCode = "54000", Country = "Pakistan", IsDefault = true,
        };
        db.Addresses.Add(address);

        await db.SaveChangesAsync();

        // ---- a few delivered orders (last 6 months) so analytics/reviews aren't empty ----
        var settings = await db.PlatformSettings.FindAsync("singleton") ?? new PlatformSetting();
        var addrSnapshot = JsonSerializer.Serialize(address.ToDto());
        var reviewed = new HashSet<(string ProductId, string UserId)>();

        for (var i = 0; i < 14; i++)
        {
            var product = products[rng.Next(products.Count)];
            var vendor = new[] { v1, v2, v3 }.First(v => v.Id == product.VendorId);
            var qty = rng.Next(1, 4);
            var created = DateTime.UtcNow.AddDays(-rng.Next(2, 175));
            var unit = product.Price;
            var subtotal = unit * qty;

            var order = new Order
            {
                CustomerId = (i % 2 == 0 ? customer : customer2).Id,
                VendorId = vendor.Id,
                Status = OrderStatuses.Delivered,
                Subtotal = subtotal,
                ShippingFee = settings.ShippingFlatFee,
                Total = subtotal + settings.ShippingFlatFee,
                CommissionRate = vendor.CommissionRate,
                CommissionAmount = Math.Round(subtotal * vendor.CommissionRate / 100m, 2),
                ShippingAddressJson = addrSnapshot,
                PaymentMethod = "Card (test)",
                PaymentReference = $"PAY-{Guid.NewGuid().ToString("n")[..12].ToUpperInvariant()}",
                CreatedAt = created,
                AcceptedAt = created.AddHours(3),
                ShippedAt = created.AddDays(1),
                DeliveredAt = created.AddDays(3),
            };
            order.Items.Add(new OrderItem
            {
                OrderId = order.Id, ProductId = product.Id, ProductName = product.Name,
                ProductImage = CatalogMap.Images(product.ImagesCsv).First(),
                UnitPrice = unit, Quantity = qty,
            });
            db.Orders.Add(order);

            // one review per (product, buyer)
            var buyer = i % 2 == 0 ? customer : customer2;
            if (rng.Next(100) < 70 && reviewed.Add((product.Id, buyer.Id)))
            {
                db.Reviews.Add(new Review
                {
                    ProductId = product.Id, UserId = buyer.Id, UserName = buyer.Name,
                    OrderId = order.Id, Rating = rng.Next(3, 6),
                    Comment = "Good quality and quick delivery. Would buy again.",
                    CreatedAt = created.AddDays(5),
                });
            }
        }

        await db.SaveChangesAsync();

        // recompute product ratings from seeded reviews
        var allReviews = await db.Reviews.ToListAsync();
        foreach (var group in allReviews.GroupBy(r => r.ProductId))
        {
            var product = await db.Products.FindAsync(group.Key);
            if (product is null) continue;
            product.RatingCount = group.Count();
            product.Rating = Math.Round(group.Average(r => r.Rating), 2);
        }
        await db.SaveChangesAsync();
    }

    private static string Img(string seed, int w, int? h = null) =>
        $"https://picsum.photos/seed/{seed}/{w}/{h ?? w}";
}
