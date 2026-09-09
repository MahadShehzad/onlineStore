using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineStore.Api.Data;
using OnlineStore.Api.Dtos;
using OnlineStore.Api.Models;
using OnlineStore.Api.Services;

namespace OnlineStore.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, ITokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { error = "An account with that email already exists." });

        var role = req.Role == Roles.Vendor ? Roles.Vendor : Roles.Customer;

        var user = new AppUser
        {
            Name = req.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = role,
        };
        db.Users.Add(user);

        Vendor? vendor = null;
        if (role == Roles.Vendor)
        {
            vendor = new Vendor
            {
                UserId = user.Id,
                StoreName = string.IsNullOrWhiteSpace(req.StoreName) ? $"{req.Name}'s Store" : req.StoreName.Trim(),
                Status = "Pending",
                CommissionRate = (await Settings()).DefaultCommissionRate,
            };
            db.Vendors.Add(vendor);
        }

        await db.SaveChangesAsync();
        return await IssueAsync(user, vendor);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Incorrect email or password." });
        if (user.IsBlocked)
            return StatusCode(403, new { error = "This account has been blocked. Contact support." });

        return await IssueAsync(user, await VendorFor(user));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest req)
    {
        var hash = tokens.Hash(req.RefreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (stored is null || !stored.IsActive)
            return Unauthorized(new { error = "Invalid or expired session. Please sign in again." });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == stored.UserId);
        if (user is null || user.IsBlocked)
            return Unauthorized(new { error = "Account is no longer active." });

        var (raw, entity) = tokens.CreateRefreshToken(user.Id);
        stored.RevokedAt = DateTime.UtcNow;
        stored.ReplacedByTokenHash = entity.TokenHash;
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync();

        var (access, expiresAt) = tokens.CreateAccessToken(user);
        return new AuthResponse(access, raw, (int)(expiresAt - DateTime.UtcNow).TotalSeconds,
            user.ToDto(await VendorFor(user)));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest req)
    {
        var hash = tokens.Hash(req.RefreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (stored is { RevokedAt: null })
        {
            stored.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == this.UserId());
        if (user is null) return NotFound();
        if (user.IsBlocked) return StatusCode(403, new { error = "Account blocked." });
        return user.ToDto(await VendorFor(user));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == this.UserId());
        if (user is null) return NotFound();

        user.Name = req.Name.Trim();
        user.Phone = req.Phone?.Trim() ?? "";
        user.AvatarUrl = req.AvatarUrl?.Trim() ?? "";
        await db.SaveChangesAsync();
        return user.ToDto(await VendorFor(user));
    }

    [Authorize]
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == this.UserId());
        if (user is null) return NotFound();
        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { error = "Your current password is incorrect." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<Vendor?> VendorFor(AppUser user) =>
        user.Role == Roles.Vendor
            ? await db.Vendors.FirstOrDefaultAsync(v => v.UserId == user.Id)
            : null;

    private async Task<PlatformSetting> Settings() =>
        await db.PlatformSettings.FindAsync("singleton") ?? new PlatformSetting();

    private async Task<ActionResult<AuthResponse>> IssueAsync(AppUser user, Vendor? vendor)
    {
        var (access, expiresAt) = tokens.CreateAccessToken(user);
        var (raw, entity) = tokens.CreateRefreshToken(user.Id);
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync();

        return new AuthResponse(access, raw, (int)(expiresAt - DateTime.UtcNow).TotalSeconds, user.ToDto(vendor));
    }
}
