using System.ComponentModel.DataAnnotations;
using OnlineStore.Api.Models;

namespace OnlineStore.Api.Dtos;

// ---- requests ----

public record RegisterRequest(
    [Required, StringLength(120, MinimumLength = 2)] string Name,
    [Required, EmailAddress] string Email,
    [Required, StringLength(100, MinimumLength = 6)] string Password,
    string? Role,
    string? StoreName);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record RefreshRequest([Required] string RefreshToken);

public record UpdateProfileRequest(
    [Required, StringLength(120, MinimumLength = 2)] string Name,
    string? Phone,
    string? AvatarUrl);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required, StringLength(100, MinimumLength = 6)] string NewPassword);

// ---- responses ----

public record UserDto(
    string Id, string Name, string Email, string Role, bool IsBlocked,
    string Phone, string AvatarUrl, string? VendorId, string? VendorStatus);

public record AuthResponse(string AccessToken, string RefreshToken, int ExpiresInSeconds, UserDto User);

public static class AuthMap
{
    public static UserDto ToDto(this AppUser u, Vendor? vendor = null) =>
        new(u.Id, u.Name, u.Email, u.Role, u.IsBlocked, u.Phone, u.AvatarUrl,
            vendor?.Id, vendor?.Status);
}
