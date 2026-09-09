using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Controllers;

[ApiController]
[Route("api/vendors")]
public class VendorsController(AppDbContext db) : ControllerBase
{
    /// <summary>Public store profile (used by the storefront).</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<VendorDto>> Get(string id)
    {
        var vendor = await db.Vendors.AsNoTracking().Include(v => v.User)
            .FirstOrDefaultAsync(v => v.Id == id && v.Status == "Approved");
        if (vendor is null) return NotFound();
        var count = await db.Products.CountAsync(p => p.VendorId == id && p.IsActive);
        return vendor.ToDto(count);
    }

    // ---- vendor: own store ----

    [Authorize(Roles = Roles.Vendor)]
    [HttpGet("me")]
    public async Task<ActionResult<VendorDto>> Mine()
    {
        var vendor = await db.Vendors.Include(v => v.User).FirstOrDefaultAsync(v => v.UserId == this.UserId());
        if (vendor is null) return NotFound();
        var count = await db.Products.CountAsync(p => p.VendorId == vendor.Id);
        return vendor.ToDto(count);
    }

    [Authorize(Roles = Roles.Vendor)]
    [HttpPut("me")]
    public async Task<ActionResult<VendorDto>> UpdateStore(StoreSettingsRequest req)
    {
        var vendor = await db.Vendors.Include(v => v.User).FirstOrDefaultAsync(v => v.UserId == this.UserId());
        if (vendor is null) return NotFound();

        vendor.StoreName = req.StoreName.Trim();
        vendor.Description = req.Description?.Trim() ?? "";
        vendor.StoreLogo = req.StoreLogo?.Trim() ?? "";
        vendor.StoreBanner = req.StoreBanner?.Trim() ?? "";
        await db.SaveChangesAsync();

        var count = await db.Products.CountAsync(p => p.VendorId == vendor.Id);
        return vendor.ToDto(count);
    }

    // ---- admin: approvals & commission ----

    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<ActionResult<PagedResult<VendorDto>>> List(
        [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] string? status, [FromQuery] string? search)
    {
        var (p, size) = Paging.Normalize(page, pageSize, 12);
        var q = db.Vendors.AsNoTracking().Include(v => v.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(v => v.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(v => v.StoreName.Contains(search) || v.User!.Email.Contains(search));

        q = q.OrderByDescending(v => v.CreatedAt);
        var total = await q.CountAsync();
        var vendors = await q.Skip((p - 1) * size).Take(size).ToListAsync();

        var ids = vendors.Select(v => v.Id).ToList();
        var counts = await db.Products.Where(pr => ids.Contains(pr.VendorId))
            .GroupBy(pr => pr.VendorId).Select(g => new { g.Key, C = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.C);

        return new PagedResult<VendorDto>(
            vendors.Select(v => v.ToDto(counts.GetValueOrDefault(v.Id))).ToList(), p, size, total);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/approve")]
    public async Task<ActionResult<VendorDto>> Approve(string id)
    {
        var vendor = await db.Vendors.Include(v => v.User).FirstOrDefaultAsync(v => v.Id == id);
        if (vendor is null) return NotFound();
        vendor.Status = "Approved";
        vendor.RejectionReason = "";
        await db.SaveChangesAsync();
        return vendor.ToDto(await db.Products.CountAsync(p => p.VendorId == id));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/reject")]
    public async Task<ActionResult<VendorDto>> Reject(string id, VendorDecisionRequest req)
    {
        var vendor = await db.Vendors.Include(v => v.User).FirstOrDefaultAsync(v => v.Id == id);
        if (vendor is null) return NotFound();
        vendor.Status = "Rejected";
        vendor.RejectionReason = req.Reason?.Trim() ?? "Did not meet marketplace requirements.";
        await db.SaveChangesAsync();
        return vendor.ToDto(await db.Products.CountAsync(p => p.VendorId == id));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}/commission")]
    public async Task<ActionResult<VendorDto>> SetCommission(string id, CommissionRequest req)
    {
        var vendor = await db.Vendors.Include(v => v.User).FirstOrDefaultAsync(v => v.Id == id);
        if (vendor is null) return NotFound();
        vendor.CommissionRate = req.CommissionRate;
        await db.SaveChangesAsync();
        return vendor.ToDto(await db.Products.CountAsync(p => p.VendorId == id));
    }
}
