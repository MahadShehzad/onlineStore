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
[Route("api/cart")]
public class CartController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CartDto>> Get() => await BuildCart();

    [HttpPost("items")]
    public async Task<ActionResult<CartDto>> Add(AddToCartRequest req)
    {
        var product = await db.Products.Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == req.ProductId && p.IsActive);
        if (product is null) return NotFound(new { error = "Product not found." });

        ProductVariant? variant = null;
        if (!string.IsNullOrWhiteSpace(req.VariantId))
        {
            variant = product.Variants.FirstOrDefault(v => v.Id == req.VariantId);
            if (variant is null) return BadRequest(new { error = "That option is unavailable." });
        }

        var stock = variant?.Stock ?? product.Stock;
        var existing = await db.CartItems
            .FirstOrDefaultAsync(c => c.UserId == this.UserId() && c.ProductId == req.ProductId
                                      && c.VariantId == req.VariantId);

        var desired = (existing?.Quantity ?? 0) + req.Quantity;
        if (desired > stock) return BadRequest(new { error = $"Only {stock} in stock." });

        if (existing is null)
            db.CartItems.Add(new CartItem
            {
                UserId = this.UserId(),
                ProductId = req.ProductId,
                VariantId = req.VariantId,
                Quantity = req.Quantity,
            });
        else
            existing.Quantity = desired;

        await db.SaveChangesAsync();
        return await BuildCart();
    }

    [HttpPut("items/{id}")]
    public async Task<ActionResult<CartDto>> Update(string id, UpdateCartRequest req)
    {
        var line = await db.CartItems.Include(c => c.Product).Include(c => c.Variant)
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == this.UserId());
        if (line is null) return NotFound();

        var stock = line.Variant?.Stock ?? line.Product?.Stock ?? 0;
        if (req.Quantity > stock) return BadRequest(new { error = $"Only {stock} in stock." });

        line.Quantity = req.Quantity;
        await db.SaveChangesAsync();
        return await BuildCart();
    }

    [HttpDelete("items/{id}")]
    public async Task<ActionResult<CartDto>> Remove(string id)
    {
        var line = await db.CartItems.FirstOrDefaultAsync(c => c.Id == id && c.UserId == this.UserId());
        if (line is not null)
        {
            db.CartItems.Remove(line);
            await db.SaveChangesAsync();
        }
        return await BuildCart();
    }

    [HttpDelete]
    public async Task<ActionResult<CartDto>> Clear()
    {
        var lines = db.CartItems.Where(c => c.UserId == this.UserId());
        db.CartItems.RemoveRange(lines);
        await db.SaveChangesAsync();
        return await BuildCart();
    }

    private async Task<CartDto> BuildCart()
    {
        var items = await db.CartItems
            .Include(c => c.Product)!.ThenInclude(p => p!.Vendor)
            .Include(c => c.Variant)
            .Where(c => c.UserId == this.UserId())
            .OrderByDescending(c => c.AddedAt)
            .ToListAsync();

        // drop lines whose product was removed / deactivated
        var stale = items.Where(c => c.Product is null || !c.Product.IsActive).ToList();
        if (stale.Count > 0)
        {
            db.CartItems.RemoveRange(stale);
            await db.SaveChangesAsync();
            items = items.Except(stale).ToList();
        }

        var lines = items.Select(c => c.ToDto()).ToList();
        return new CartDto(lines, lines.Sum(l => l.UnitPrice * l.Quantity), lines.Sum(l => l.Quantity));
    }
}
