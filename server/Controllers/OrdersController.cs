using System.Text.Json;
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
[Route("api/orders")]
public class OrdersController(AppDbContext db) : ControllerBase
{
    // ---- customer: place an order from the cart ----

    [Authorize(Roles = Roles.Customer)]
    [HttpPost("checkout")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> Checkout(CheckoutRequest req)
    {
        var userId = this.UserId();

        var address = await db.Addresses.FirstOrDefaultAsync(a => a.Id == req.AddressId && a.UserId == userId);
        if (address is null) return BadRequest(new { error = "Choose a valid shipping address." });

        var cart = await db.CartItems
            .Include(c => c.Product)!.ThenInclude(p => p!.Vendor)
            .Include(c => c.Variant)
            .Where(c => c.UserId == userId)
            .ToListAsync();

        if (cart.Count == 0) return BadRequest(new { error = "Your cart is empty." });

        // stock re-check
        foreach (var line in cart)
        {
            var stock = line.Variant?.Stock ?? line.Product?.Stock ?? 0;
            if (line.Product is null || !line.Product.IsActive)
                return BadRequest(new { error = "A product in your cart is no longer available." });
            if (line.Quantity > stock)
                return BadRequest(new { error = $"'{line.Product.Name}' only has {stock} left." });
        }

        var settings = await Settings();
        var addressSnapshot = JsonSerializer.Serialize(address.ToDto());
        var reference = $"PAY-{Guid.NewGuid().ToString("n")[..12].ToUpperInvariant()}";

        var created = new List<Order>();
        foreach (var group in cart.GroupBy(c => c.Product!.VendorId))
        {
            var vendor = group.First().Product!.Vendor!;
            var order = new Order
            {
                CustomerId = userId,
                VendorId = group.Key,
                Status = OrderStatuses.Pending,
                ShippingAddressJson = addressSnapshot,
                PaymentMethod = req.PaymentMethod,
                PaymentReference = reference,
                CommissionRate = vendor.CommissionRate,
                ShippingFee = settings.ShippingFlatFee,
            };

            foreach (var line in group)
            {
                var unit = (line.Product!.Price) + (line.Variant?.PriceDelta ?? 0m);
                order.Items.Add(new OrderItem
                {
                    OrderId = order.Id,
                    ProductId = line.ProductId,
                    ProductName = line.Product.Name,
                    ProductImage = CatalogMap.Images(line.Product.ImagesCsv).FirstOrDefault() ?? "",
                    VariantLabel = line.Variant is null ? "" : $"{line.Variant.Name}: {line.Variant.Value}",
                    UnitPrice = unit,
                    Quantity = line.Quantity,
                });

                // decrement stock
                if (line.Variant is not null) line.Variant.Stock -= line.Quantity;
                else line.Product.Stock -= line.Quantity;
            }

            order.Subtotal = order.Items.Sum(i => i.UnitPrice * i.Quantity);
            order.Total = order.Subtotal + order.ShippingFee;
            order.CommissionAmount = Math.Round(order.Subtotal * order.CommissionRate / 100m, 2);
            db.Orders.Add(order);
            created.Add(order);
        }

        db.CartItems.RemoveRange(cart);
        await db.SaveChangesAsync();

        var ids = created.Select(o => o.Id).ToList();
        var full = await db.Orders.Include(o => o.Items).Include(o => o.Vendor).Include(o => o.Customer)
            .Where(o => ids.Contains(o.Id)).ToListAsync();
        return full.Select(o => o.ToDto()).ToList();
    }

    // ---- customer: my orders ----

    [Authorize(Roles = Roles.Customer)]
    [HttpGet("mine")]
    public async Task<ActionResult<PagedResult<OrderDto>>> Mine(
        [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] string? status)
    {
        var (p, size) = Paging.Normalize(page, pageSize, 10);
        var q = db.Orders.AsNoTracking()
            .Include(o => o.Items).Include(o => o.Vendor).Include(o => o.Customer)
            .Where(o => o.CustomerId == this.UserId());

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(o => o.Status == status);

        q = q.OrderByDescending(o => o.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((p - 1) * size).Take(size).ToListAsync();
        return new PagedResult<OrderDto>(items.Select(o => o.ToDto()).ToList(), p, size, total);
    }

    // ---- vendor: orders for my store ----

    [Authorize(Roles = Roles.Vendor)]
    [HttpGet("vendor")]
    public async Task<ActionResult<PagedResult<OrderDto>>> VendorOrders(
        [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] string? status)
    {
        var vendor = await CurrentVendor();
        if (vendor is null) return Forbid();

        var (p, size) = Paging.Normalize(page, pageSize, 10);
        var q = db.Orders.AsNoTracking()
            .Include(o => o.Items).Include(o => o.Vendor).Include(o => o.Customer)
            .Where(o => o.VendorId == vendor.Id);

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(o => o.Status == status);

        q = q.OrderByDescending(o => o.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((p - 1) * size).Take(size).ToListAsync();
        return new PagedResult<OrderDto>(items.Select(o => o.ToDto()).ToList(), p, size, total);
    }

    // ---- admin: every order ----

    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<ActionResult<PagedResult<OrderDto>>> All(
        [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] string? status, [FromQuery] string? search)
    {
        var (p, size) = Paging.Normalize(page, pageSize, 15);
        var q = db.Orders.AsNoTracking()
            .Include(o => o.Items).Include(o => o.Vendor).Include(o => o.Customer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(o => o.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(o => o.Id.Contains(search) || o.Customer!.Name.Contains(search)
                             || o.Vendor!.StoreName.Contains(search));

        q = q.OrderByDescending(o => o.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((p - 1) * size).Take(size).ToListAsync();
        return new PagedResult<OrderDto>(items.Select(o => o.ToDto()).ToList(), p, size, total);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> Detail(string id)
    {
        var order = await db.Orders.AsNoTracking()
            .Include(o => o.Items).Include(o => o.Vendor).Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();

        if (!await CanSee(order)) return Forbid();
        return order.ToDto();
    }

    // ---- customer: cancel a still-pending order ----

    [Authorize(Roles = Roles.Customer)]
    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<OrderDto>> Cancel(string id)
    {
        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (order.CustomerId != this.UserId()) return Forbid();
        if (order.Status != OrderStatuses.Pending)
            return BadRequest(new { error = "Only pending orders can be cancelled." });

        order.Status = OrderStatuses.Cancelled;
        await RestockAsync(order);
        await db.SaveChangesAsync();
        return await Reload(order.Id);
    }

    // ---- vendor: advance / reject an order ----

    [Authorize(Roles = Roles.Vendor)]
    [HttpPut("{id}/status")]
    public async Task<ActionResult<OrderDto>> SetStatus(string id, OrderStatusRequest req)
    {
        var vendor = await CurrentVendor();
        if (vendor is null) return Forbid();

        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (order.VendorId != vendor.Id) return Forbid();

        var next = req.Status;
        var allowed = order.Status switch
        {
            OrderStatuses.Pending => new[] { OrderStatuses.Accepted, OrderStatuses.Rejected },
            OrderStatuses.Accepted => new[] { OrderStatuses.Shipped },
            OrderStatuses.Shipped => new[] { OrderStatuses.Delivered },
            _ => [],
        };
        if (!allowed.Contains(next))
            return BadRequest(new { error = $"Can't move an order from {order.Status} to {next}." });

        order.Status = next;
        switch (next)
        {
            case OrderStatuses.Accepted: order.AcceptedAt = DateTime.UtcNow; break;
            case OrderStatuses.Shipped: order.ShippedAt = DateTime.UtcNow; break;
            case OrderStatuses.Delivered: order.DeliveredAt = DateTime.UtcNow; break;
            case OrderStatuses.Rejected:
                await RestockAsync(order);
                break;
        }

        await db.SaveChangesAsync();
        return await Reload(order.Id);
    }

    private async Task RestockAsync(Order order)
    {
        foreach (var item in order.Items)
        {
            var product = await db.Products.Include(p => p.Variants).FirstOrDefaultAsync(p => p.Id == item.ProductId);
            if (product is null) continue;
            var variant = product.Variants.FirstOrDefault(v =>
                item.VariantLabel != "" && $"{v.Name}: {v.Value}" == item.VariantLabel);
            if (variant is not null) variant.Stock += item.Quantity;
            else product.Stock += item.Quantity;
        }
    }

    private async Task<bool> CanSee(Order order)
    {
        var role = this.UserRole();
        if (role == Roles.Admin) return true;
        if (role == Roles.Customer) return order.CustomerId == this.UserId();
        if (role == Roles.Vendor)
        {
            var vendor = await CurrentVendor();
            return vendor is not null && order.VendorId == vendor.Id;
        }
        return false;
    }

    private async Task<OrderDto> Reload(string id)
    {
        var fresh = await db.Orders.AsNoTracking()
            .Include(o => o.Items).Include(o => o.Vendor).Include(o => o.Customer)
            .FirstAsync(o => o.Id == id);
        return fresh.ToDto();
    }

    private Task<Vendor?> CurrentVendor() =>
        db.Vendors.FirstOrDefaultAsync(v => v.UserId == this.UserId());

    private async Task<PlatformSetting> Settings() =>
        await db.PlatformSettings.FindAsync("singleton") ?? new PlatformSetting();
}
