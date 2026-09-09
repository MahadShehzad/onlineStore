using System.Globalization;
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
[Route("api/analytics")]
public class AnalyticsController(AppDbContext db) : ControllerBase
{
    private static readonly string[] Earning =
        [OrderStatuses.Accepted, OrderStatuses.Shipped, OrderStatuses.Delivered];

    [Authorize(Roles = Roles.Vendor)]
    [HttpGet("vendor")]
    public async Task<ActionResult<VendorAnalyticsDto>> Vendor()
    {
        var vendor = await db.Vendors.FirstOrDefaultAsync(v => v.UserId == this.UserId());
        if (vendor is null) return Forbid();

        var orders = await db.Orders.AsNoTracking()
            .Where(o => o.VendorId == vendor.Id)
            .Select(o => new { o.Status, o.Subtotal, o.CommissionAmount, o.CreatedAt })
            .ToListAsync();

        var earning = orders.Where(o => Earning.Contains(o.Status)).ToList();
        var revenue = earning.Sum(o => o.Subtotal);
        var commission = earning.Sum(o => o.CommissionAmount);

        var productCount = await db.Products.CountAsync(p => p.VendorId == vendor.Id);

        var topProducts = await db.OrderItems.AsNoTracking()
            .Where(i => i.Order!.VendorId == vendor.Id && Earning.Contains(i.Order!.Status))
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Units = g.Sum(x => x.Quantity) })
            .OrderByDescending(x => x.Units)
            .Take(5)
            .ToListAsync();

        var topIds = topProducts.Select(t => t.ProductId).ToList();
        var topEntities = await db.Products.AsNoTracking()
            .Include(p => p.Category).Include(p => p.Vendor)
            .Where(p => topIds.Contains(p.Id)).ToListAsync();
        var top = topProducts
            .Select(t => topEntities.FirstOrDefault(p => p.Id == t.ProductId))
            .Where(p => p is not null)
            .Select(p => p!.ToSummary())
            .ToArray();

        return new VendorAnalyticsDto(
            revenue, earning.Count,
            orders.Count(o => o.Status == OrderStatuses.Pending),
            productCount, commission,
            DailySeries(earning.Select(o => (o.CreatedAt, o.Subtotal))),
            MonthlySeries(earning.Select(o => (o.CreatedAt, o.Subtotal))),
            top);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("admin")]
    public async Task<ActionResult<AdminAnalyticsDto>> Admin()
    {
        var orders = await db.Orders.AsNoTracking()
            .Select(o => new { o.Status, o.Subtotal, o.Total, o.CommissionAmount, o.CreatedAt, o.VendorId })
            .ToListAsync();
        var earning = orders.Where(o => Earning.Contains(o.Status)).ToList();

        var topVendors = earning
            .GroupBy(o => o.VendorId)
            .Select(g => new { VendorId = g.Key, Revenue = g.Sum(x => x.Subtotal), Orders = g.Count() })
            .OrderByDescending(x => x.Revenue)
            .Take(5)
            .ToList();
        var vIds = topVendors.Select(v => v.VendorId).ToList();
        var vNames = await db.Vendors.Where(v => vIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id, v => v.StoreName);

        return new AdminAnalyticsDto(
            Gmv: earning.Sum(o => o.Subtotal),
            CommissionEarned: earning.Sum(o => o.CommissionAmount),
            OrderCount: orders.Count,
            CustomerCount: await db.Users.CountAsync(u => u.Role == Roles.Customer),
            VendorCount: await db.Vendors.CountAsync(v => v.Status == "Approved"),
            PendingVendorCount: await db.Vendors.CountAsync(v => v.Status == "Pending"),
            ProductCount: await db.Products.CountAsync(p => p.IsActive),
            OpenDisputeCount: await db.Disputes.CountAsync(d => d.Status == "Open"),
            Monthly: MonthlySeries(earning.Select(o => (o.CreatedAt, o.Subtotal))),
            TopVendors: topVendors
                .Select(v => new VendorLeaderRow(v.VendorId,
                    vNames.GetValueOrDefault(v.VendorId, "Store"), v.Revenue, v.Orders))
                .ToArray());
    }

    private static TimeSeriesPoint[] DailySeries(IEnumerable<(DateTime When, decimal Amount)> rows)
    {
        var data = rows.ToList();
        var today = DateTime.UtcNow.Date;
        return Enumerable.Range(0, 14)
            .Select(i => today.AddDays(-13 + i))
            .Select(day =>
            {
                var slice = data.Where(r => r.When.Date == day).ToList();
                return new TimeSeriesPoint(day.ToString("dd MMM", CultureInfo.InvariantCulture),
                    slice.Sum(r => r.Amount), slice.Count);
            })
            .ToArray();
    }

    private static TimeSeriesPoint[] MonthlySeries(IEnumerable<(DateTime When, decimal Amount)> rows)
    {
        var data = rows.ToList();
        var anchor = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        return Enumerable.Range(0, 12)
            .Select(i => anchor.AddMonths(-11 + i))
            .Select(month =>
            {
                var slice = data.Where(r => r.When.Year == month.Year && r.When.Month == month.Month).ToList();
                return new TimeSeriesPoint(month.ToString("MMM yy", CultureInfo.InvariantCulture),
                    slice.Sum(r => r.Amount), slice.Count);
            })
            .ToArray();
    }
}
