using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController(AppDbContext db) : ControllerBase
{
    [HttpGet("product/{productId}")]
    public async Task<ActionResult<PagedResult<ReviewDto>>> ForProduct(
        string productId, [FromQuery] int? page, [FromQuery] int? pageSize)
    {
        var (p, size) = Paging.Normalize(page, pageSize, 10);
        var q = db.Reviews.AsNoTracking()
            .Where(r => r.ProductId == productId)
            .OrderByDescending(r => r.CreatedAt);

        var total = await q.CountAsync();
        var items = await q.Skip((p - 1) * size).Take(size).ToListAsync();
        return new PagedResult<ReviewDto>(items.Select(r => r.ToDto()).ToList(), p, size, total);
    }

    /// <summary>Whether the current customer may review this product (bought + received, not yet reviewed).</summary>
    [Authorize(Roles = Roles.Customer)]
    [HttpGet("eligibility/{productId}")]
    public async Task<ActionResult<object>> Eligibility(string productId)
    {
        var already = await db.Reviews.AnyAsync(r => r.ProductId == productId && r.UserId == this.UserId());
        var purchased = await HasDeliveredPurchase(productId);
        return new { canReview = purchased && !already, alreadyReviewed = already, purchased };
    }

    [Authorize(Roles = Roles.Customer)]
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> Create(ReviewCreateRequest req)
    {
        if (await db.Reviews.AnyAsync(r => r.ProductId == req.ProductId && r.UserId == this.UserId()))
            return Conflict(new { error = "You've already reviewed this product." });
        if (!await HasDeliveredPurchase(req.ProductId))
            return StatusCode(403, new { error = "You can only review products from a delivered order." });

        var user = await db.Users.FindAsync(this.UserId());
        var review = new Review
        {
            ProductId = req.ProductId,
            UserId = this.UserId(),
            UserName = user?.Name ?? "Customer",
            Rating = req.Rating,
            Comment = req.Comment.Trim(),
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        await RecomputeRating(req.ProductId);
        await db.SaveChangesAsync();

        return review.ToDto();
    }

    private async Task<bool> HasDeliveredPurchase(string productId) =>
        await db.Orders.AnyAsync(o => o.CustomerId == this.UserId()
                                      && o.Status == OrderStatuses.Delivered
                                      && o.Items.Any(i => i.ProductId == productId));

    private async Task RecomputeRating(string productId)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId);
        if (product is null) return;

        var ratings = await db.Reviews.Where(r => r.ProductId == productId).Select(r => r.Rating).ToListAsync();
        product.RatingCount = ratings.Count;
        product.Rating = ratings.Count == 0 ? 0 : Math.Round(ratings.Average(), 2);
    }
}
