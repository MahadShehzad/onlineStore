using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/disputes")]
public class DisputesController(AppDbContext db) : ControllerBase
{
    [Authorize(Roles = Roles.Customer)]
    [HttpPost]
    public async Task<ActionResult<DisputeDto>> Create(DisputeCreateRequest req)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == req.OrderId);
        if (order is null) return NotFound(new { error = "Order not found." });
        if (order.CustomerId != this.UserId()) return Forbid();
        if (await db.Disputes.AnyAsync(d => d.OrderId == req.OrderId && d.Status == "Open"))
            return Conflict(new { error = "There's already an open complaint for this order." });

        var user = await db.Users.FindAsync(this.UserId());
        var dispute = new Dispute
        {
            OrderId = req.OrderId,
            RaisedByUserId = this.UserId(),
            Subject = req.Subject.Trim(),
            Description = req.Description.Trim(),
        };
        db.Disputes.Add(dispute);
        await db.SaveChangesAsync();
        return dispute.ToDto(user?.Name ?? "Customer");
    }

    [Authorize(Roles = Roles.Customer)]
    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<DisputeDto>>> Mine()
    {
        var list = await db.Disputes.AsNoTracking()
            .Where(d => d.RaisedByUserId == this.UserId())
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();
        var name = (await db.Users.FindAsync(this.UserId()))?.Name ?? "Customer";
        return list.Select(d => d.ToDto(name)).ToList();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<ActionResult<PagedResult<DisputeDto>>> All(
        [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] string? status)
    {
        var (p, size) = Paging.Normalize(page, pageSize, 12);
        var q = db.Disputes.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(d => d.Status == status);
        q = q.OrderByDescending(d => d.CreatedAt);

        var total = await q.CountAsync();
        var rows = await q.Skip((p - 1) * size).Take(size).ToListAsync();

        var userIds = rows.Select(d => d.RaisedByUserId).Distinct().ToList();
        var names = await db.Users.Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Name);

        return new PagedResult<DisputeDto>(
            rows.Select(d => d.ToDto(names.GetValueOrDefault(d.RaisedByUserId, "Customer"))).ToList(),
            p, size, total);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}/resolve")]
    public async Task<ActionResult<DisputeDto>> Resolve(string id, DisputeResolveRequest req)
    {
        var dispute = await db.Disputes.FirstOrDefaultAsync(d => d.Id == id);
        if (dispute is null) return NotFound();

        dispute.Status = req.Status == "Rejected" ? "Rejected" : "Resolved";
        dispute.Resolution = req.Resolution.Trim();
        dispute.ResolvedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var name = (await db.Users.FindAsync(dispute.RaisedByUserId))?.Name ?? "Customer";
        return dispute.ToDto(name);
    }
}
