using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Models;

namespace OnlineStore.Api.Data;

/// <summary>
/// Idempotent startup seed. Runs after migrations so a fresh database always has
/// an admin account, a demo approved vendor, and the base category tree.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (!await db.Categories.AnyAsync())
        {
            db.Categories.AddRange(
                new Category { Name = "Electronics", Slug = "electronics" },
                new Category { Name = "Fashion", Slug = "fashion" },
                new Category { Name = "Home & Living", Slug = "home-living" },
                new Category { Name = "Beauty", Slug = "beauty" },
                new Category { Name = "Sports", Slug = "sports" },
                new Category { Name = "Books", Slug = "books" });
            await db.SaveChangesAsync();
        }

        if (!await db.Users.AnyAsync())
        {
            var admin = new AppUser
            {
                Name = "Platform Admin",
                Email = "admin@onlinestore.test",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Role = Roles.Admin,
            };
            var customer = new AppUser
            {
                Name = "Demo Customer",
                Email = "customer@onlinestore.test",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Customer@123"),
                Role = Roles.Customer,
            };
            var vendorUser = new AppUser
            {
                Name = "Demo Vendor",
                Email = "vendor@onlinestore.test",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Vendor@123"),
                Role = Roles.Vendor,
            };
            db.Users.AddRange(admin, customer, vendorUser);
            await db.SaveChangesAsync();

            db.Vendors.Add(new Vendor
            {
                UserId = vendorUser.Id,
                StoreName = "Demo Store",
                Description = "A seeded demo storefront.",
                Status = "Approved",
                CommissionRate = 10m,
            });
            await db.SaveChangesAsync();
        }
    }
}
