namespace OnlineStore.Api.Dtos;

/// <summary>A single page of results plus the totals a client needs to render a pager.</summary>
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalItems)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalItems / (double)PageSize);
}

public static class Paging
{
    public const int MaxPageSize = 60;

    public static (int page, int size) Normalize(int? page, int? pageSize, int defaultSize = 12)
    {
        var p = Math.Max(1, page ?? 1);
        var s = Math.Clamp(pageSize ?? defaultSize, 1, MaxPageSize);
        return (p, s);
    }
}
