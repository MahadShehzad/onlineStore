using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace OnlineStore.Api.Services;

public static class ControllerExtensions
{
    /// <summary>The signed-in user's id from the validated JWT, or "" if anonymous.</summary>
    public static string UserId(this ControllerBase c) =>
        c.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

    public static string UserRole(this ControllerBase c) =>
        c.User.FindFirstValue(ClaimTypes.Role) ?? "";
}
