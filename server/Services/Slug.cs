using System.Text;
using System.Text.RegularExpressions;

namespace OnlineStore.Api.Services;

public static partial class Slug
{
    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex NonAlnum();

    public static string From(string value)
    {
        var lower = value.Trim().ToLowerInvariant();
        var slug = NonAlnum().Replace(lower, "-").Trim('-');
        return string.IsNullOrEmpty(slug) ? Guid.NewGuid().ToString("n")[..8] : slug;
    }

    /// <summary>Append a short random suffix so slugs stay unique without a lookup.</summary>
    public static string Unique(string value) =>
        $"{From(value)}-{Guid.NewGuid().ToString("n")[..6]}";
}
