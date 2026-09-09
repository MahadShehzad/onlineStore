using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Controllers;

[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    // ---- users ----

    [HttpGet("users")]
    public async Task<ActionResult<PagedResult<AdminUserDto>>> Users(
        [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] string? role, [FromQuery] string? search)
    {
        var (p, size) = Paging.Normalize(page, pageSize, 15);
        var q = db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
            q = q.Where(u => u.Role == role);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => u.Name.Contains(search) || u.Email.Contains(search));

        q = q.OrderByDescending(u => u.CreatedAt);
        var total = await q.CountAsync();
        var users = await q.Skip((p - 1) * size).Take(size).ToListAsync();

        var ids = users.Select(u => u.Id).ToList();
        var orderCounts = await db.Orders.Where(o => ids.Contains(o.CustomerId))
            .GroupBy(o => o.CustomerId).Select(g => new { g.Key, C = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.C);
        var vendorStatus = await db.Vendors.Where(v => ids.Contains(v.UserId))
            .ToDictionaryAsync(v => v.UserId, v => v.Status);

        var rows = users.Select(u => new AdminUserDto(
            u.Id, u.Name, u.Email, u.Role, u.IsBlocked, u.CreatedAt,
            orderCounts.GetValueOrDefault(u.Id), vendorStatus.GetValueOrDefault(u.Id))).ToList();

        return new PagedResult<AdminUserDto>(rows, p, size, total);
    }

    [HttpPut("users/{id}/block")]
    public async Task<ActionResult<AdminUserDto>> Block(string id, BlockRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        if (user.Role == Roles.Admin) return BadRequest(new { error = "Admin accounts can't be blocked." });

        user.IsBlocked = req.Blocked;
        if (req.Blocked)
        {
            var tokens = db.RefreshTokens.Where(t => t.UserId == id && t.RevokedAt == null);
            await tokens.ForEachAsync(t => t.RevokedAt = DateTime.UtcNow);
        }
        await db.SaveChangesAsync();

        var orders = await db.Orders.CountAsync(o => o.CustomerId == id);
        var vendor = await db.Vendors.FirstOrDefaultAsync(v => v.UserId == id);
        return new AdminUserDto(user.Id, user.Name, user.Email, user.Role, user.IsBlocked,
            user.CreatedAt, orders, vendor?.Status);
    }

    // ---- platform settings ----

    [HttpGet("settings")]
    public async Task<ActionResult<PlatformSettingDto>> GetSettings() =>
        (await Load()).ToDto();

    [HttpPut("settings")]
    public async Task<ActionResult<PlatformSettingDto>> UpdateSettings(PlatformSettingRequest req)
    {
        var s = await Load();
        s.DefaultCommissionRate = req.DefaultCommissionRate;
        s.ShippingFlatFee = req.ShippingFlatFee;
        await db.SaveChangesAsync();
        return s.ToDto();
    }

    private async Task<PlatformSetting> Load()
    {
        var s = await db.PlatformSettings.FindAsync("singleton");
        if (s is null)
        {
            s = new PlatformSetting();
            db.PlatformSettings.Add(s);
            await db.SaveChangesAsync();
        }
        return s;
    }
}
