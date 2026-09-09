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
[Route("api/addresses")]
public class AddressesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AddressDto>>> List()
    {
        var list = await db.Addresses
            .Where(a => a.UserId == this.UserId())
            .OrderByDescending(a => a.IsDefault).ThenBy(a => a.FullName)
            .ToListAsync();
        return list.Select(a => a.ToDto()).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<AddressDto>> Create(AddressUpsertRequest req)
    {
        var address = Apply(new Address { UserId = this.UserId() }, req);
        db.Addresses.Add(address);
        if (req.IsDefault || !await db.Addresses.AnyAsync(a => a.UserId == this.UserId()))
            await MakeDefault(address);
        await db.SaveChangesAsync();
        return address.ToDto();
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AddressDto>> Update(string id, AddressUpsertRequest req)
    {
        var address = await db.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == this.UserId());
        if (address is null) return NotFound();

        Apply(address, req);
        if (req.IsDefault) await MakeDefault(address);
        await db.SaveChangesAsync();
        return address.ToDto();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var address = await db.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == this.UserId());
        if (address is null) return NotFound();
        db.Addresses.Remove(address);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static Address Apply(Address a, AddressUpsertRequest r)
    {
        a.FullName = r.FullName.Trim();
        a.Phone = r.Phone.Trim();
        a.Line1 = r.Line1.Trim();
        a.Line2 = r.Line2?.Trim() ?? "";
        a.City = r.City.Trim();
        a.State = r.State.Trim();
        a.PostalCode = r.PostalCode.Trim();
        a.Country = r.Country.Trim();
        return a;
    }

    private async Task MakeDefault(Address address)
    {
        var others = await db.Addresses
            .Where(a => a.UserId == this.UserId() && a.Id != address.Id && a.IsDefault)
            .ToListAsync();
        others.ForEach(a => a.IsDefault = false);
        address.IsDefault = true;
    }
}
