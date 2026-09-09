using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Controllers;

[ApiController]
[Authorize(Roles = Roles.Customer)]
[Route("api/wishlist")]
public class WishlistController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductSummaryDto>>> List()
    {
        var items = await db.WishlistItems
            .Include(w => w.Product)!.ThenInclude(p => p!.Category)
            .Include(w => w.Product)!.ThenInclude(p => p!.Vendor)
            .Where(w => w.UserId == this.UserId())
            .OrderByDescending(w => w.AddedAt)
            .ToListAsync();

        return items.Where(w => w.Product is not null)
            .Select(w => w.Product!.ToSummary())
            .ToList();
    }

    /// <summary>Returns the ids the current user has wishlisted — for hydrating heart icons.</summary>
    [HttpGet("ids")]
    public async Task<ActionResult<IEnumerable<string>>> Ids() =>
        await db.WishlistItems.Where(w => w.UserId == this.UserId())
            .Select(w => w.ProductId).ToListAsync();

    [HttpPost("toggle")]
    public async Task<ActionResult<object>> Toggle(WishlistToggleRequest req)
    {
        var existing = await db.WishlistItems
            .FirstOrDefaultAsync(w => w.UserId == this.UserId() && w.ProductId == req.ProductId);

        if (existing is not null)
        {
            db.WishlistItems.Remove(existing);
            await db.SaveChangesAsync();
            return new { wishlisted = false };
        }

        if (!await db.Products.AnyAsync(p => p.Id == req.ProductId))
            return NotFound(new { error = "Product not found." });

        db.WishlistItems.Add(new WishlistItem { UserId = this.UserId(), ProductId = req.ProductId });
        await db.SaveChangesAsync();
        return new { wishlisted = true };
    }
}
