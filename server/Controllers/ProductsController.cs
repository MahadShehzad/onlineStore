using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    // ---- public browsing (server-side pagination + filters + search + sort) ----

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductSummaryDto>>> Browse(
        [FromQuery] int? page, [FromQuery] int? pageSize,
        [FromQuery] string? search, [FromQuery] string? categoryId, [FromQuery] string? categorySlug,
        [FromQuery] string? brand, [FromQuery] decimal? minPrice, [FromQuery] decimal? maxPrice,
        [FromQuery] int? minRating, [FromQuery] string? sort, [FromQuery] string? vendorId)
    {
        var (p, size) = Paging.Normalize(page, pageSize, 12);

        var q = db.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Vendor)
            .Where(x => x.IsActive && x.Vendor!.Status == "Approved");

        if (!string.IsNullOrWhiteSpace(categorySlug))
            q = q.Where(x => x.Category!.Slug == categorySlug);
        if (!string.IsNullOrWhiteSpace(categoryId))
            q = q.Where(x => x.CategoryId == categoryId);
        if (!string.IsNullOrWhiteSpace(vendorId))
            q = q.Where(x => x.VendorId == vendorId);
        if (!string.IsNullOrWhiteSpace(brand))
            q = q.Where(x => x.Brand == brand);
        if (minPrice is > 0)
            q = q.Where(x => x.Price >= minPrice);
        if (maxPrice is > 0)
            q = q.Where(x => x.Price <= maxPrice);
        if (minRating is > 0)
            q = q.Where(x => x.Rating >= minRating);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            q = q.Where(x => x.Name.Contains(term) || x.Brand.Contains(term) || x.Description.Contains(term));
        }

        q = sort switch
        {
            "price_asc" => q.OrderBy(x => x.Price),
            "price_desc" => q.OrderByDescending(x => x.Price),
            "rating" => q.OrderByDescending(x => x.Rating).ThenByDescending(x => x.RatingCount),
            "name" => q.OrderBy(x => x.Name),
            _ => q.OrderByDescending(x => x.CreatedAt),
        };

        var total = await q.CountAsync();
        var items = await q.Skip((p - 1) * size).Take(size).ToListAsync();
        return new PagedResult<ProductSummaryDto>(items.Select(x => x.ToSummary()).ToList(), p, size, total);
    }

    /// <summary>Brand list + price bounds for the filter sidebar, scoped to the current category.</summary>
    [HttpGet("filters")]
    public async Task<ActionResult<object>> Filters([FromQuery] string? categorySlug)
    {
        var q = db.Products.AsNoTracking().Where(x => x.IsActive && x.Vendor!.Status == "Approved");
        if (!string.IsNullOrWhiteSpace(categorySlug))
            q = q.Where(x => x.Category!.Slug == categorySlug);

        var brands = await q.Where(x => x.Brand != "")
            .Select(x => x.Brand).Distinct().OrderBy(x => x).ToListAsync();
        var hasAny = await q.AnyAsync();
        var min = hasAny ? await q.MinAsync(x => x.Price) : 0m;
        var max = hasAny ? await q.MaxAsync(x => x.Price) : 0m;
        return new { brands, minPrice = Math.Floor(min), maxPrice = Math.Ceiling(max) };
    }

    [HttpGet("{idOrSlug}")]
    public async Task<ActionResult<ProductDetailDto>> Detail(string idOrSlug)
    {
        var product = await db.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Vendor)
            .Include(x => x.Variants)
            .FirstOrDefaultAsync(x => x.Id == idOrSlug || x.Slug == idOrSlug);

        if (product is null) return NotFound();
        return product.ToDetail();
    }

    [HttpGet("{id}/related")]
    public async Task<ActionResult<IEnumerable<ProductSummaryDto>>> Related(string id)
    {
        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (product is null) return NotFound();

        var related = await db.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Vendor)
            .Where(x => x.IsActive && x.Id != id && x.CategoryId == product.CategoryId
                        && x.Vendor!.Status == "Approved")
            .OrderByDescending(x => x.Rating)
            .Take(8)
            .ToListAsync();

        return related.Select(x => x.ToSummary()).ToList();
    }

    // ---- vendor-owned products ----

    [Authorize(Roles = Roles.Vendor)]
    [HttpGet("mine")]
    public async Task<ActionResult<PagedResult<ProductSummaryDto>>> Mine(
        [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] string? search)
    {
        var vendor = await CurrentVendor();
        if (vendor is null) return Forbid();

        var (p, size) = Paging.Normalize(page, pageSize, 10);
        var q = db.Products.AsNoTracking()
            .Include(x => x.Category).Include(x => x.Vendor)
            .Where(x => x.VendorId == vendor.Id);

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(x => x.Name.Contains(search.Trim()));

        q = q.OrderByDescending(x => x.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((p - 1) * size).Take(size).ToListAsync();
        return new PagedResult<ProductSummaryDto>(items.Select(x => x.ToSummary()).ToList(), p, size, total);
    }

    [Authorize(Roles = Roles.Vendor)]
    [HttpPost]
    public async Task<ActionResult<ProductDetailDto>> Create(ProductUpsertRequest req)
    {
        var vendor = await CurrentVendor();
        if (vendor is null) return Forbid();
        if (vendor.Status != "Approved")
            return StatusCode(403, new { error = "Your store must be approved before you can list products." });
        if (!await db.Categories.AnyAsync(c => c.Id == req.CategoryId))
            return BadRequest(new { error = "Unknown category." });

        var product = new Product
        {
            VendorId = vendor.Id,
            Name = req.Name.Trim(),
            Slug = Slug.Unique(req.Name),
            Description = req.Description.Trim(),
            Price = req.Price,
            Stock = req.Stock,
            CategoryId = req.CategoryId,
            Brand = req.Brand?.Trim() ?? "",
            ImagesCsv = CatalogMap.JoinImages(req.Images ?? []),
            IsActive = req.IsActive,
        };
        ApplyVariants(product, req.Variants);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        return await ReloadDetail(product.Id);
    }

    [Authorize(Roles = Roles.Vendor)]
    [HttpPut("{id}")]
    public async Task<ActionResult<ProductDetailDto>> Update(string id, ProductUpsertRequest req)
    {
        var vendor = await CurrentVendor();
        if (vendor is null) return Forbid();

        var product = await db.Products.Include(x => x.Variants).FirstOrDefaultAsync(x => x.Id == id);
        if (product is null) return NotFound();
        if (product.VendorId != vendor.Id) return Forbid();

        product.Name = req.Name.Trim();
        product.Description = req.Description.Trim();
        product.Price = req.Price;
        product.Stock = req.Stock;
        product.CategoryId = req.CategoryId;
        product.Brand = req.Brand?.Trim() ?? "";
        product.ImagesCsv = CatalogMap.JoinImages(req.Images ?? []);
        product.IsActive = req.IsActive;

        db.ProductVariants.RemoveRange(product.Variants);
        product.Variants.Clear();
        ApplyVariants(product, req.Variants);

        await db.SaveChangesAsync();
        return await ReloadDetail(product.Id);
    }

    [Authorize(Roles = Roles.Vendor)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var vendor = await CurrentVendor();
        if (vendor is null) return Forbid();

        var product = await db.Products.FirstOrDefaultAsync(x => x.Id == id);
        if (product is null) return NotFound();
        if (product.VendorId != vendor.Id) return Forbid();

        if (await db.OrderItems.AnyAsync(i => i.ProductId == id))
        {
            // keep order history intact — soft delete
            product.IsActive = false;
            await db.SaveChangesAsync();
            return Ok(new { softDeleted = true });
        }

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void ApplyVariants(Product product, ProductVariantInput[]? variants)
    {
        foreach (var v in variants ?? [])
        {
            if (string.IsNullOrWhiteSpace(v.Name) || string.IsNullOrWhiteSpace(v.Value)) continue;
            product.Variants.Add(new ProductVariant
            {
                ProductId = product.Id,
                Name = v.Name.Trim(),
                Value = v.Value.Trim(),
                PriceDelta = v.PriceDelta,
                Stock = Math.Max(0, v.Stock),
            });
        }
    }

    private async Task<ProductDetailDto> ReloadDetail(string id)
    {
        var fresh = await db.Products.AsNoTracking()
            .Include(x => x.Category).Include(x => x.Vendor).Include(x => x.Variants)
            .FirstAsync(x => x.Id == id);
        return fresh.ToDetail();
    }

    private Task<Vendor?> CurrentVendor() =>
        db.Vendors.FirstOrDefaultAsync(v => v.UserId == this.UserId());
}
