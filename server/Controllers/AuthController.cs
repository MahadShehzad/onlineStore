using System.Security.Claims;
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

        var vendor = user.Role == Roles.Vendor
            ? await db.Vendors.FirstOrDefaultAsync(v => v.UserId == user.Id)
            : null;

        return await IssueAsync(user, vendor);
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

        // Rotate: revoke the presented token, issue a fresh pair.
        var (raw, entity) = tokens.CreateRefreshToken(user.Id);
        stored.RevokedAt = DateTime.UtcNow;
        stored.ReplacedByTokenHash = entity.TokenHash;
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync();

        var vendor = user.Role == Roles.Vendor
            ? await db.Vendors.FirstOrDefaultAsync(v => v.UserId == user.Id)
            : null;

        var (access, expiresAt) = tokens.CreateAccessToken(user);
        return new AuthResponse(access, raw, (int)(expiresAt - DateTime.UtcNow).TotalSeconds, user.ToDto(vendor));
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
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        var vendor = user.Role == Roles.Vendor
            ? await db.Vendors.FirstOrDefaultAsync(v => v.UserId == user.Id)
            : null;

        return user.ToDto(vendor);
    }

    private async Task<ActionResult<AuthResponse>> IssueAsync(AppUser user, Vendor? vendor)
    {
        var (access, expiresAt) = tokens.CreateAccessToken(user);
        var (raw, entity) = tokens.CreateRefreshToken(user.Id);
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync();

        return new AuthResponse(access, raw, (int)(expiresAt - DateTime.UtcNow).TotalSeconds, user.ToDto(vendor));
    }
}
