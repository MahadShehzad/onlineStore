using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;

namespace OnlineStore.Api.Controllers;

/// <summary>Public, cache-friendly bits the storefront needs before login.</summary>
[ApiController]
[Route("api/meta")]
public class MetaController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PlatformSettingDto>> Get()
    {
        var s = await db.PlatformSettings.FindAsync("singleton") ?? new PlatformSetting();
        return s.ToDto();
    }
}
