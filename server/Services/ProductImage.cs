using System.Net;
using System.Text;

namespace OnlineStore.Api.Services;

/// <summary>
/// Generates self-contained product images as SVG data URIs, so the catalogue
/// always renders regardless of network access to an external image host.
/// </summary>
public static class ProductImage
{
    private static readonly (string A, string B)[] Ramps =
    [
        ("#0f3040", "#1b556f"), // teal
        ("#a56f63", "#d99b7f"), // clay / sand
        ("#464858", "#6b6d80"), // slate
        ("#123c50", "#0c2733"), // deep teal
        ("#935f54", "#c98a72"), // rosewood
    ];

    /// <summary>Three tinted variations for a product's gallery.</summary>
    public static IEnumerable<string> Gallery(string name, string store, int categoryIndex)
    {
        for (var i = 0; i < 3; i++)
        {
            var (a, b) = Ramps[(categoryIndex + i) % Ramps.Length];
            yield return DataUri(name, store, a, b, 150 + i * 55);
        }
    }

    private static string DataUri(string name, string store, string a, string b, int angle)
    {
        var title = WebUtility.HtmlEncode(Trim(name, 34));
        var sub = WebUtility.HtmlEncode(Trim(store, 26));
        var initials = WebUtility.HtmlEncode(Initials(name));

        var svg = $"""
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700" viewBox="0 0 700 700">
  <defs><linearGradient id="g" gradientTransform="rotate({angle})">
    <stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/>
  </linearGradient></defs>
  <rect width="700" height="700" fill="url(#g)"/>
  <circle cx="350" cy="290" r="150" fill="rgba(255,255,255,0.10)"/>
  <text x="350" y="330" font-family="Segoe UI,Arial,sans-serif" font-size="150" font-weight="700"
        fill="rgba(255,255,255,0.92)" text-anchor="middle">{initials}</text>
  <text x="350" y="540" font-family="Segoe UI,Arial,sans-serif" font-size="34" font-weight="600"
        fill="#fff" text-anchor="middle">{title}</text>
  <text x="350" y="585" font-family="Segoe UI,Arial,sans-serif" font-size="22"
        fill="rgba(255,255,255,0.75)" text-anchor="middle">{sub}</text>
</svg>
""";
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(svg));
        return $"data:image/svg+xml;base64,{base64}";
    }

    private static string Initials(string name)
    {
        var words = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var letters = words.Take(2).Select(w => char.ToUpperInvariant(w[0]));
        return string.Concat(letters);
    }

    private static string Trim(string value, int max) =>
        value.Length <= max ? value : value[..(max - 1)] + "…";
}
