using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> List()
    {
        var counts = await db.Products
            .Where(p => p.IsActive)
            .GroupBy(p => p.CategoryId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);

        var categories = await db.Categories.OrderBy(c => c.Name).ToListAsync();
        return categories
            .Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Icon, c.ParentId,
                counts.GetValueOrDefault(c.Id)))
            .ToList();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(CategoryUpsertRequest req)
    {
        var category = new Category
        {
            Name = req.Name.Trim(),
            Slug = Slug.Unique(req.Name),
            Icon = string.IsNullOrWhiteSpace(req.Icon) ? "bi-tag" : req.Icon.Trim(),
            ParentId = req.ParentId,
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return new CategoryDto(category.Id, category.Name, category.Slug, category.Icon, category.ParentId, 0);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryDto>> Update(string id, CategoryUpsertRequest req)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null) return NotFound();

        category.Name = req.Name.Trim();
        category.Icon = string.IsNullOrWhiteSpace(req.Icon) ? category.Icon : req.Icon.Trim();
        category.ParentId = req.ParentId;
        await db.SaveChangesAsync();

        var count = await db.Products.CountAsync(p => p.CategoryId == id && p.IsActive);
        return new CategoryDto(category.Id, category.Name, category.Slug, category.Icon, category.ParentId, count);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null) return NotFound();
        if (await db.Products.AnyAsync(p => p.CategoryId == id))
            return BadRequest(new { error = "Move or remove this category's products first." });

        db.Categories.Remove(category);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
