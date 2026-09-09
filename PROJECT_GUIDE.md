# onlineStore — Poora Project Samajhne Ke Liye Guide

Ye document project ke **har hissay** ko detail me samjhata hai: architecture, har
folder, Angular ke concepts, JWT auth, database connection, API, Bootstrap/CSS
logic, responsive design, server-side pagination — aur poore examples jo click se
le kar SQL Server tak trace karte hain.

> Roman Urdu me likha hai (jaise `EnterpriseSystem` ka guide). README.md chhota
> "kaise chalayein" wala hai; ye file "kaise kaam karta hai" wali hai.

---

## 0. Sab Se Pehle — Bird's Eye View

Project **3 alag alag programs** ka mel hai:

```
┌───────────────────────┐    HTTP (/api/*)     ┌────────────────────────┐   EF Core / TDS    ┌───────────────┐
│  Angular SPA           │ ─────────────────►  │  ASP.NET Core Web API   │ ────────────────►  │  SQL Server   │
│  (browser me chalta)   │                     │  (C#, .NET 10)          │                    │  OnlineStore  │
│  http://localhost:4200 │ ◄──── JSON ───────  │  http://localhost:5103  │ ◄──── rows ──────  │  SQLEXPRESS   │
└───────────────────────┘                     └────────────────────────┘                    └───────────────┘
        │                                              │                                          │
   src/ folder                                    server/ folder                          (aapke PC pe service)
   TypeScript / Bootstrap                         C#                                        MSSQL$SQLEXPRESS
```

| Layer | Kaam | Language | Folder |
|---|---|---|---|
| **Frontend (SPA)** | UI, user interaction, cart/checkout/dashboards | TypeScript / HTML / Bootstrap CSS | `src/` |
| **Backend (API)** | Business rules, JWT auth, DB queries, JSON | C# (.NET 10) | `server/` |
| **Database** | Data permanently store (tables/rows) | SQL (T-SQL) | SQL Server engine |

**Browser kabhi bhi SQL Server se seedha baat nahi karta.** Beech me API hoti hai jo:
- JWT token verify karti hai (kaun ho, kaun sa role),
- request validate karti hai (`[Required]`, range checks),
- EF Core se SQL query banati hai,
- sirf safe JSON wapas bhejti hai (password hash kabhi frontend ko nahi jaata).

### 3 User Roles (poore project ki buniyaad)

| Role | Kya kar sakta hai | Landing page |
|---|---|---|
| **Customer** | Browse, search, filter, cart, wishlist, checkout, order tracking, reviews, complaints | `/app/shop` |
| **Vendor** | Apna store, product CRUD, order accept/reject/ship, sales analytics, store settings | `/app/vendor` |
| **Admin** | Vendor approval, categories, users (block), commission, disputes, platform analytics | `/app/admin` |

Admin account **signup page se nahi banta** (security) — sirf database seeder banata hai.

---

## 1. `npm run dev` — Ye Kya Hai

`npm run <name>` sirf `package.json` ke `"scripts"` block me likha command chalata
hai. Naam kuch bhi ho sakta hai.

```json
"scripts": {
  "start": "ng serve",
  "api":   "dotnet run --project server --launch-profile http",
  "db:update": "dotnet ef database update --project server",
  "dev":   "concurrently -k -n api,web -c blue,green \"npm:api\" \"npm:start\"",
  "predev": "kill-port 4200 5103"
}
```

- `npm start` → sirf Angular (`ng serve`) → `http://localhost:4200`
- `npm run api` → sirf C# API (`dotnet run`) → `http://localhost:5103`
- `npm run dev` → **`concurrently`** utility se **dono ek saath**, ek terminal me,
  colour-coded. `-k` = ek process mare to doosra bhi kill. `predev` pehle dono
  ports free kar deta hai (`kill-port`) — "Port already in use" error khatam.

`ng serve` khud:
1. TypeScript → JavaScript compile,
2. dev web server `:4200` pe,
3. file change → auto reload,
4. **`proxy.conf.json`** padhta hai — jo `/api/*` requests ko chupke se
   `http://localhost:5103` (C# API) pe forward karta hai. Isi wajah se frontend me
   sirf `/api/products` likhte hain, poora URL nahi.

```json
// proxy.conf.json
{ "/api": { "target": "http://localhost:5103", "secure": false, "changeOrigin": true } }
```

---

## 2. Do Poori Kahaniyan (End-to-End Trace)

### 2A. Customer cart me daal ke checkout karta hai

**Browser side (Angular):**

1. `product-card` ya `product-detail` me "Add to cart" → `CartService.add(productId, qty, variantId)`:
   ```ts
   this._cart.set(await firstValueFrom(
     this.http.post<Cart>('/api/cart/items', { productId, quantity, variantId })
   ));
   ```
   `_cart` ek **signal** hai. Set hote hi header ka cart badge (`cart.count()`) turant update.
2. `/app/checkout` khulta hai — `CheckoutComponent` addresses load karta
   (`GET /api/addresses`), payment method radio, card form.
3. "Place order" → agar card select hai to card number ka last-4 nikaal ke
   `paymentMethod = "Card •••• 1234"` banata (koi validation nahi — demo).
4. `OrderService.checkout(addressId, paymentMethod)` → `POST /api/orders/checkout`.

**Network:** `ng serve` proxy `/api/orders/checkout` → `localhost:5103/...`.
Interceptor (`authInterceptor`) request pe `Authorization: Bearer <access-token>` laga deta hai.

**Backend side (C# — `OrdersController.Checkout`):**

5. `[Authorize(Roles = Roles.Customer)]` → JWT verify + role check.
6. Cart lines DB se load, **stock re-check** (koi aur bhi to abhi khareed nahi liya).
7. **Cart ko vendor ke hisaab se split** — har vendor ka alag `Order` banta:
   ```csharp
   foreach (var group in cart.GroupBy(c => c.Product!.VendorId))
   {
     var order = new Order { CustomerId = userId, VendorId = group.Key, ... };
     foreach (var line in group) {
       order.Items.Add(new OrderItem { ... UnitPrice = product.Price + variant.PriceDelta, ... });
       line.Product.Stock -= line.Quantity;          // stock kam
     }
     order.Subtotal        = order.Items.Sum(i => i.UnitPrice * i.Quantity);
     order.ShippingFee     = settings.ShippingFlatFee;
     order.Total           = order.Subtotal + order.ShippingFee;
     order.CommissionRate  = vendor.CommissionRate;
     order.CommissionAmount = Math.Round(order.Subtotal * rate / 100, 2);
     db.Orders.Add(order);
   }
   db.CartItems.RemoveRange(cart);       // cart khali
   await db.SaveChangesAsync();          // EF: INSERT Orders + OrderItems, UPDATE Products.Stock, DELETE CartItems
   ```

**Database:** `OnlineStore` DB me `Orders`, `OrderItems` rows insert, `Products.Stock`
update, `CartItems` delete — **sab ek transaction me**.

**Wapsi:** Controller banaye gaye orders ka `OrderDto[]` return karta. Frontend
`CartService.load()` dobara call karke badge 0 karta, aur single order ho to
`/app/orders/:id` pe navigate.

### 2B. Vendor product list karta hai (aur "1,23000" wala bug)

1. `/app/vendor/products` → "Add product" → modal (reactive form + `FormArray`
   for images/variants).
2. Vendor Price me "1,23000" likhta (comma). Field `type="text"` hai isliye
   string control me aata hai.
3. "Save product" → `ProductManagementComponent.save()`:
   ```ts
   private toNumber(v: unknown): number {
     const cleaned = String(v ?? '').replace(/[^0-9.-]/g, '');   // "1,23000" → "123000"
     return cleaned === '' ? NaN : Number(cleaned);
   }
   ```
   Agar number ban gaya → control me daal do; agar NaN → `setErrors({number:true})`
   + toast `"Please check: Price, Stock."` (exact field naam).
4. Valid hone pe `POST /api/products` → `[Authorize(Roles = Roles.Vendor)]` →
   agar vendor `Status != "Approved"` to 403 → interceptor toast dikhata.
5. Approved vendor ka product `Products` table me insert, slug auto-generate
   (`Slug.Unique`), images newline-separated store (`ImagesCsv`), variants child rows.

---

## 3. Folder Structure — Har Folder Kyun Hai

```
onlineStore/
├── src/                              ← ANGULAR FRONTEND
│   ├── main.ts                       browser bootstrap
│   ├── main.server.ts / server.ts    SSR entry (public storefront ke liye)
│   ├── styles.css                    GLOBAL: Bootstrap theme override + palette + shell + auth CSS
│   ├── index.html                    <app-root>
│   └── app/
│       ├── app.ts / app.html         root (router-outlet + toasts + confirm dialog)
│       ├── app.config.ts             DI: router, HttpClient + interceptors, app-initializer
│       ├── app.routes.ts             saare routes, lazy loadComponent, role guards
│       ├── app.routes.server.ts      /app + auth = Client render; storefront = Server (SSR)
│       ├── core/                     singletons — poori app me ek instance
│       │   ├── models/               TypeScript interfaces (data ki shape)
│       │   │   ├── user.model.ts          Role, User, homeRouteFor()
│       │   │   ├── auth.model.ts          RegisterPayload, AuthResponse, AuthResult
│       │   │   ├── catalog.model.ts       PagedResult<T>, Category, Product*, Review, ProductQuery
│       │   │   ├── commerce.model.ts      Cart, CartLine, Address, Order, OrderItem, Dispute
│       │   │   └── vendor.model.ts        Vendor, *Analytics, AdminUser, PlatformSetting
│       │   ├── services/             HTTP + state (Injectable, providedIn:'root')
│       │   │   ├── auth.service.ts        login/register/refresh/logout, user signal, roles
│       │   │   ├── token.service.ts       localStorage wrapper (access + refresh + user)
│       │   │   ├── cart.service.ts        server cart as signal + header badge count
│       │   │   ├── wishlist.service.ts    Set<productId> signal
│       │   │   ├── catalog.service.ts     categories, product browse/detail, vendor CRUD
│       │   │   ├── order.service.ts       checkout, mine/vendor/all, status transitions
│       │   │   ├── address.service.ts     address book CRUD
│       │   │   ├── review.service.ts      product reviews + eligibility
│       │   │   ├── vendor.service.ts      store settings, admin approve/reject/commission
│       │   │   ├── admin.service.ts       users, settings, analytics, disputes
│       │   │   ├── dispute.service.ts     customer raise + list
│       │   │   ├── meta.service.ts        public platform config (currency, shipping)
│       │   │   ├── notification.service.ts toast queue (signal)
│       │   │   └── http-params.ts         toParams() — query object → HttpParams
│       │   ├── guards/               route ke "darbaan" (CanActivateFn)
│       │   │   ├── auth.guard.ts          login hai? nahi → /login?returnUrl=
│       │   │   ├── role.guard.ts          data.allowedRoles me role hai? nahi → /app/forbidden
│       │   │   └── role-home.guard.ts     /app → role ke hisaab se sahi dashboard
│       │   └── interceptors/
│       │       ├── auth.interceptor.ts    Bearer token attach + 401 → single-flight refresh retry
│       │       └── error.interceptor.ts   non-401 errors → toast
│       ├── shared/                   reusable UI, poori app me
│       │   ├── pipes/money.pipe.ts        number → "Rs 18,999" (MetaService se symbol)
│       │   ├── directives/fallback-img.directive.ts   broken image → placeholder, lazy load
│       │   └── ui/
│       │       ├── product-card.ts        grid card: wishlist heart, rating, add-to-cart
│       │       ├── pagination.ts          server pager: page + totalPages → pageChange
│       │       ├── star-rating.ts         display + editable stars
│       │       ├── bar-chart.ts           dependency-free inline SVG bar chart
│       │       ├── spinner.ts / empty-state.ts
│       │       ├── order-status-badge.ts  status → coloured badge
│       │       ├── confirm.service.ts + confirm-dialog.ts   promise-based confirm modal
│       ├── layout/shell/             signed-in frame: top bar + collapsible sidebar + outlet
│       │   ├── shell.ts / shell.html
│       │   └── nav.ts                role-wise sidebar catalogue (NavSection[])
│       └── features/                 har page apna folder (feature-based)
│           ├── home/                 public storefront landing
│           ├── auth/login/ + signup/
│           ├── customer/  shop, product-list, product-detail, cart, checkout,
│           │              order-history, order-detail, wishlist, addresses, disputes
│           ├── vendor/    vendor-dashboard, product-management, order-management,
│           │              vendor-analytics, store-settings
│           ├── admin/     admin-dashboard, vendor-approval, category-management,
│           │              user-management, order-oversight, commission-settings,
│           │              dispute-management, admin-analytics
│           ├── account/profile/
│           └── forbidden/
│
├── server/                           ← ASP.NET CORE API (C#)
│   ├── Program.cs                     startup: controllers, JWT bearer, EF, CORS, migrate + seed
│   ├── appsettings.json               connection string + Jwt settings
│   ├── Models/Entities.cs             14 entity classes = 14 DB tables
│   ├── Data/
│   │   ├── AppDbContext.cs            DbSets + relationships + indexes
│   │   └── DbSeeder.cs                startup demo data (idempotent)
│   ├── Dtos/                          request/response records + mappers
│   │   ├── Common.cs                  PagedResult<T>, Paging.Normalize()
│   │   ├── AuthDtos.cs  CatalogDtos.cs  CartDtos.cs  OrderDtos.cs  VendorAdminDtos.cs
│   ├── Services/
│   │   ├── TokenService.cs            JWT access token + refresh token (hash + rotation)
│   │   ├── Slug.cs                    name → url-slug
│   │   ├── ProductImage.cs            generated SVG data-URI images
│   │   └── ControllerExtensions.cs    this.UserId() / this.UserRole() from claims
│   ├── Controllers/                   13 REST controllers
│   └── Migrations/                    EF-generated schema (version controlled)
│
├── proxy.conf.json                    /api → localhost:5103 (dev only)
├── angular.json                       Angular CLI config (Bootstrap CSS/JS wired here)
├── package.json                       npm scripts + deps
├── .github/workflows/ci.yml           GitHub Actions: build + test frontend, build backend
├── README.md                          quick "kaise chalayein"
└── PROJECT_GUIDE.md                   ye file
```

### Feature-based architecture kyun

- App bari hai (25+ feature screens). Type-based hote to `components/` me 60+ files.
- Ek feature pe kaam asaan — `features/vendor/product-management/` kholo, sab wahin.
- **Lazy loading natural** — har feature = alag JS chunk, sirf tab download jab
  user us route pe jaaye. `ng build` output me: `chunk-xxx.js | product-detail`.

`core/` vs `shared/`:
- `core/` = poori app me **ek instance** (services, guards, interceptors) — state
  rakhte hain.
- `shared/` = **kai jagah copy** ho ke use hone wale "dumb" UI (product-card,
  pagination) — koi apna state nahi.

---

## 4. Angular Ke Building Blocks Jo Yahan Use Hue

### 4.1 Standalone Components (koi NgModule nahi)

Har component apni dependencies `imports:` me khud declare karta:

```ts
@Component({
  selector: 'app-product-list',
  imports: [FormsModule, ProductCardComponent, PaginationComponent, SpinnerComponent, EmptyStateComponent],
  templateUrl: './product-list.html',
})
export class ProductListComponent { ... }
```

### 4.2 Signals — reactive state

Signal ek **box** hai; value badle to jo bhi padh raha tha wo auto-update:

```ts
const count = signal(0);
count();                     // padho → 0
count.set(5);                // likho
count.update(n => n + 1);
const doubled = computed(() => count() * 2);   // derived
```

Is project me state signals me hai:
- `AuthService.user` = `signal<User | null>`
- `CartService.cart` = `signal<Cart>` ; `CartService.count` = `computed(() => cart().count)`
- `WishlistService.ids` = `signal<Set<string>>`
- har component ka local `loading`, `page`, `result`, `modalOpen` — sab signals

### 4.3 `effect()` — jab bhi andar padha signal change ho, dobara chalo

`product-list.ts` isse filters + route query pe **auto re-fetch** karta:

```ts
effect(() => {
  const q: ProductQuery = {
    page: this.page(), sort: this.sort(), brand: this.brand(),
    minRating: this.minRating(), minPrice: this.priceMin(), maxPrice: this.priceMax(),
    categorySlug: this.routeQuery().category, search: this.routeQuery().search,
  };
  this.loading.set(true);
  this.catalog.browse(q).subscribe(r => { this.result.set(r); this.loading.set(false); });
});
```

Koi bhi filter signal set karo → effect dobara chalta → nayi API call → grid update.
`product-detail` bhi `effect(() => this.load(this.slug()))` se slug change pe reload karta.

### 4.4 `toSignal()` — Observable ko signal banao

```ts
private readonly routeQuery = toSignal(
  this.route.queryParamMap.pipe(map(p => ({ category: p.get('category') ?? '', search: p.get('search') ?? '' }))),
  { initialValue: { category: '', search: '' } },
);
```

### 4.5 Dependency Injection — `inject()`

```ts
private readonly catalog = inject(CatalogService);
private readonly notify  = inject(NotificationService);
```

`@Injectable({ providedIn: 'root' })` = ek global instance. Isi wajah se
`CartService` ka cart signal header aur cart page dono me same hai.

### 4.6 Routing + Lazy + Role Guards

`app.routes.ts` me ek chhota helper spread hota hai:

```ts
const customer = { canActivate: [roleGuard], data: { allowedRoles: ['Customer'] } };
const vendor   = { canActivate: [roleGuard], data: { allowedRoles: ['Vendor'] } };
const admin    = { canActivate: [roleGuard], data: { allowedRoles: ['Admin'] } };

{
  path: 'vendor/products',
  ...vendor,
  loadComponent: () => import('./features/vendor/product-management/product-management')
    .then(m => m.ProductManagementComponent),
}
```

- `loadComponent: () => import(...)` — LAZY: alag chunk, sirf zaroorat pe download.
- `/app` ka empty path `roleHomeGuard` se guzarta jo role dekh ke sahi dashboard
  pe `UrlTree` return karta.

### 4.7 `withComponentInputBinding()`

`app.config.ts` me on hai → route params component ke `input()` me bind:

```ts
// route:  path: 'product/:slug'
readonly slug = input.required<string>();   // "/product/leather-bag-abc123" → slug() = "leather-bag-abc123"
```

### 4.8 SSR render modes (`app.routes.server.ts`)

Auth localStorage-based hai — server pe localStorage nahi hota. Isliye:

```ts
export const serverRoutes: ServerRoute[] = [
  { path: 'app',    renderMode: RenderMode.Client },   // dashboards: client-only
  { path: 'app/**', renderMode: RenderMode.Client },
  { path: 'login',  renderMode: RenderMode.Client },
  { path: 'signup', renderMode: RenderMode.Client },
  { path: '**',     renderMode: RenderMode.Server },    // public storefront: SSR (SEO/first paint)
];
```

---

## 5. Frontend Data Layer — Per-Feature Services (EnterpriseSystem se farq)

`EnterpriseSystem` me ek bara `DataStoreService` sab kuch load karta tha. Yahan
data bohot zyada hai (paginated products, orders…) isliye **har domain ka apna
service** hai, aur **do tarah ke** hote hain:

**(a) Stateful signal services** — jinki value poori app me live share honi chahiye:

```ts
// cart.service.ts
private readonly _cart = signal<Cart>(EMPTY);
readonly cart  = this._cart.asReadonly();
readonly count = computed(() => this._cart().count);

async add(productId, quantity, variantId?) {
  this._cart.set(await firstValueFrom(
    this.http.post<Cart>('/api/cart/items', { productId, quantity, variantId })
  ));
}
```

`CartService`, `WishlistService`, `AuthService`, `MetaService`, `NotificationService`.

**(b) Stateless HTTP services** — bas API call, result seedha component ke local
signal me:

```ts
// catalog.service.ts
browse(query: ProductQuery): Observable<PagedResult<ProductSummary>> {
  const sort = query.sort === 'newest' ? undefined : query.sort;
  return this.http.get<PagedResult<ProductSummary>>('/api/products', { params: toParams({ ...query, sort }) });
}
```

`CatalogService`, `OrderService`, `AddressService`, `ReviewService`, `VendorService`,
`AdminService`, `DisputeService`. Component pattern:

```ts
protected readonly result  = signal<PagedResult<Order> | null>(null);
protected readonly loading = signal(true);
protected load(): void {
  this.loading.set(true);
  this.orders.mine(this.page(), 8, this.status() || undefined).subscribe({
    next: r => { this.result.set(r); this.loading.set(false); },
    error: () => this.loading.set(false),
  });
}
```

App startup pe `app.config.ts` ka `provideAppInitializer` sirf halki cheezein
load karta (meta + session restore + cart/wishlist if logged in), poora catalogue
nahi — wo har page apni zaroorat ke hisaab se maangta hai.

---

## 6. Auth Flow — JWT Access + Refresh Token

### 6.1 Tokens kya hain

- **Access token** — chhota JWT (15 min). Har request pe jaata hai. Isme user id,
  name, email, **role** claims hote (signed, tamper-proof).
- **Refresh token** — bara random string (7 din). Sirf naya access token lene ke
  liye. DB me **hash** ho ke store hota (raw kabhi save nahi), aur har use pe
  **rotate** hota (purana revoke, naya issue).

### 6.2 Storage (`token.service.ts`)

`localStorage` me 3 keys: `onlinestore:access`, `onlinestore:refresh`,
`onlinestore:user`. Har read/write `try/catch` me (SSR / private mode safe).
`localStorage` isliye (session nahi) taake refresh token se **band karke kholne
pe bhi login rahe**.

### 6.3 Login (`auth.service.ts`)

```ts
async login(payload): Promise<AuthResult> {
  const res = await firstValueFrom(this.http.post<AuthResponse>('/api/auth/login', payload));
  this.tokens.setSession(res.accessToken, res.refreshToken, res.user);
  this._user.set(res.user);          // signal — guards/shell/pages sab react karte
  return { ok: true, user: res.user };
}
```

`user` signal se derived: `isAuthenticated = computed(() => user() !== null)`,
`role = computed(() => user()?.role ?? null)`.

### 6.4 Interceptor — token attach + auto refresh (`auth.interceptor.ts`)

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. har request pe access token laga do
  const authed = next(req.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } }));

  return authed.pipe(catchError(err => {
    if (err.status !== 401 || isAuthCall || !tokens.refreshToken) return throwError(() => err);

    // 2. 401 mila → SINGLE-FLIGHT refresh: chahe 5 request ek saath fail hon,
    //    sirf ek /api/auth/refresh call jaayegi (shareReplay), baaki uska result use karengi
    refreshInFlight ??= auth.refresh().pipe(
      map(res => res.accessToken),
      catchError(e => { auth.clearSession(); return throwError(() => e); }),
      finalize(() => { refreshInFlight = null; }),
      shareReplay(1),
    );
    return refreshInFlight.pipe(switchMap(fresh =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } }))));   // 3. asli request dobara
  }));
};
```

### 6.5 Guards

- `authGuard` — `auth.isAuthenticated()` false → `/login?returnUrl=<jahan jaana tha>`
- `roleGuard` — `route.data.allowedRoles` me role nahi → `/app/forbidden`
- `roleHomeGuard` — `/app` khula → `homeRouteFor(user)` (`Admin → /app/admin`,
  `Vendor → /app/vendor`, `Customer → /app/shop`)

### 6.6 Backend side (`AuthController` + `TokenService`)

- `register` — email unique check, `BCrypt.HashPassword`, vendor ho to `Vendor`
  row `Status = "Pending"` ke saath.
- `login` — `BCrypt.Verify`, blocked check, phir `IssueAsync` (access + refresh pair).
- `refresh` — presented refresh token ka hash DB me dhoondo, active hai to
  **revoke + naya pair**.
- `logout` — refresh token revoke.
- `me` — claims se user id nikaal ke fresh user DTO.

```csharp
// TokenService.CreateRefreshToken
var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
var entity = new RefreshToken { UserId = userId, TokenHash = Hash(raw),      // SHA-256
                                ExpiresAt = DateTime.UtcNow.AddDays(7) };
return (raw, entity);   // raw client ko, entity (hash) DB me
```

---

## 7. The API — `server/` (ASP.NET Core + EF Core)

### 7.1 `Program.cs` — startup

```csharp
builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(cfg.GetConnectionString("Default")));

// JWT bearer auth
var jwt = cfg.GetSection("Jwt").Get<JwtOptions>()!;
builder.Services.AddSingleton(jwt);
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
    o.TokenValidationParameters = new() {
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true,
        ValidIssuer = jwt.Issuer, ValidAudience = jwt.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddPolicy("spa", p => p
    .WithOrigins("http://localhost:4200").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope()) {            // startup pe:
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();                        // 1. migrations apply (DB/tables bana do)
    await DbSeeder.SeedAsync(db);                            // 2. demo data (agar khali hai)
}

app.UseCors("spa");
app.UseAuthentication();   // token padho
app.UseAuthorization();    // [Authorize] enforce
app.MapControllers();
app.Run();
```

- **CORS** — browser rule: `:4200` se `:5103` "cross-origin". API ko explicitly
  allow karna parta.
- `MigrateAsync()` — is line se manually `dotnet ef database update` ki zaroorat
  nahi (dev convenience).

### 7.2 Controllers — `[Authorize(Roles = ...)]`

```csharp
[ApiController]
[Route("api/products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]                                   // GET /api/products  (PUBLIC — koi [Authorize] nahi)
    public async Task<ActionResult<PagedResult<ProductSummaryDto>>> Browse(...) { ... }

    [Authorize(Roles = Roles.Vendor)]           // sirf vendor
    [HttpPost]                                   // POST /api/products
    public async Task<ActionResult<ProductDetailDto>> Create(ProductUpsertRequest req) {
        var vendor = await CurrentVendor();
        if (vendor.Status != "Approved")
            return StatusCode(403, new { error = "Your store must be approved first." });
        ...
    }
}
```

- `(AppDbContext db)` — **primary constructor**, DI se inject (Angular `inject()` jaisa).
- `ProductUpsertRequest req` — JSON body auto-deserialize into C# record.
- `this.UserId()` — extension jo JWT claims se user id nikaalta (`ControllerExtensions.cs`).

13 controllers: `Auth`, `Categories`, `Products`, `Cart`, `Wishlist`, `Addresses`,
`Orders`, `Reviews`, `Vendors`, `Admin`, `Disputes`, `Analytics`, `Meta`.

### 7.3 Server-Side Pagination — `PagedResult<T>` (`Dtos/Common.cs`)

Frontend kabhi poori list nahi maangta — hamesha ek page:

```csharp
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalItems)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalItems / (double)PageSize);
}

public static (int page, int size) Normalize(int? page, int? pageSize, int def = 12) =>
    (Math.Max(1, page ?? 1), Math.Clamp(pageSize ?? def, 1, 60));
```

Controller:

```csharp
var (p, size) = Paging.Normalize(page, pageSize, 12);
var q = db.Products.AsNoTracking().Where(x => x.IsActive && x.Vendor!.Status == "Approved");
// ... filters (category, brand, minPrice, maxPrice, minRating, search) ...
q = sort switch {
    "price_asc"  => q.OrderBy(x => x.Price),
    "price_desc" => q.OrderByDescending(x => x.Price),
    "rating"     => q.OrderByDescending(x => x.Rating),
    _            => q.OrderByDescending(x => x.CreatedAt),
};
var total = await q.CountAsync();                                  // SELECT COUNT(*)
var items = await q.Skip((p - 1) * size).Take(size).ToListAsync(); // SELECT ... OFFSET .. FETCH ..
return new PagedResult<ProductSummaryDto>(items.Select(x => x.ToSummary()).ToList(), p, size, total);
```

Frontend `PaginationComponent` `page` + `totalPages` inputs leta, `pageChange`
emit karta; component nayi page pe `load()` dobara call karta.

**Products, orders (customer/vendor/admin), vendors, users, reviews, disputes —
sab paginated.**

### 7.4 DTOs vs Entities — do shapes kyun

- **Entity** (`Models/Entities.cs`) = DB table ki exact copy. `AppUser.PasswordHash`,
  `Product.ImagesCsv` (SQL me array nahi, isliye newline-separated string).
- **DTO** = jo JSON frontend ko chahiye. `UserDto` me `PasswordHash` **nahi**;
  `ProductDetailDto.Images` ek proper **array** `string[]`.

```csharp
public static string[] Images(string stored) =>                    // "a\nb\nc" → ["a","b","c"]
    string.IsNullOrWhiteSpace(stored) ? [] : stored.Split('\n', StringSplitOptions.RemoveEmptyEntries);

public static ProductSummaryDto ToSummary(this Product p) =>
    new(p.Id, p.Name, p.Slug, p.Price, Images(p.ImagesCsv), p.Brand,
        p.CategoryId, p.Category?.Name ?? "", p.VendorId, p.Vendor?.StoreName ?? "",
        Math.Round(p.Rating, 2), p.RatingCount, p.Stock, p.IsActive);
```

**Comma se newline kyun:** ek generated image `data:image/svg+xml;base64,...` hoti
hai jisme khud comma hota — CSV split tootta. Isliye images newline-joined.

### 7.5 EF Core — ORM

Aap C# LINQ likhte, EF SQL banata:

| C# / LINQ | SQL |
|---|---|
| `db.Products.ToListAsync()` | `SELECT * FROM Products` |
| `db.Products.FindAsync(id)` | `SELECT * FROM Products WHERE Id = @id` |
| `p.Stock -= 2; db.SaveChangesAsync();` | `UPDATE Products SET Stock = Stock - 2 WHERE Id = @id` |
| `db.Orders.Add(o); db.SaveChangesAsync();` | `INSERT INTO Orders (...) VALUES (...)` |
| `q.Include(o => o.Items)` | `LEFT JOIN OrderItems ...` |

`AppDbContext` = DB ke saath ek "session". `OnModelCreating` me keys, unique
indexes (`Users.Email`, `Vendors.UserId`), precision (`decimal(18,2)` prices),
aur cascade rules define hote.

### 7.6 Migrations

```
dotnet ef migrations add Init     → Migrations/<timestamp>_Init.cs (CREATE TABLE ... as C#)
dotnet ef database update         → wo SQL Server pe chalta → DB ban gayi
```

`Migrations/` git me commit hai. Doosre PC pe bas `npm run db:update`.
`__EFMigrationsHistory` table track karti kaun si apply ho chuki.

### 7.7 Seeder (`Data/DbSeeder.cs`)

`Program.cs` startup pe `DbSeeder.SeedAsync(db)` — **idempotent** (`if (await
db.Users.AnyAsync()) return;`). Banata:
- Platform settings singleton (commission 10%, shipping Rs 200, currency PKR)
- Admin + 2 customers + 4 vendor users (3 approved + 1 pending)
- 6 categories, ~24 products (variants for fashion/sports)
- 14 delivered orders (last 6 months) + reviews → analytics/charts khali na hon
- Product images `ProductImage.Gallery()` se — **generated SVG data-URI**
  (palette gradient + monogram + naam), koi external image host nahi.

---

## 8. Database Connection — Poori Tafseel

### 8.1 Connection string (`server/appsettings.json`)

```json
"ConnectionStrings": {
  "Default": "Server=localhost\\SQLEXPRESS;Database=OnlineStore;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=False"
},
"Jwt": {
  "Issuer": "onlinestore-api", "Audience": "onlinestore-spa",
  "SigningKey": "dev-only-change-me-...", "AccessTokenMinutes": 15, "RefreshTokenDays": 7
}
```

| Part | Matlab |
|---|---|
| `Server=localhost\SQLEXPRESS` | Machine + SQL Server **instance** (`SQLEXPRESS` = Express default). `\\` = C# me `\`. |
| `Database=OnlineStore` | Kaun si database |
| `Trusted_Connection=True` | **Windows Authentication** — alag user/pass nahi, aapka Windows login |
| `TrustServerCertificate=True` | Dev me self-signed SSL cert trust karo |
| `Encrypt=False` | Local dev, encryption ki zaroorat nahi |

### 8.2 Connection flow

1. `Program.cs` → `opt.UseSqlServer(cs)` — EF ko batao SQL Server + kahan.
2. Pehli query pe EF **connection pool** se connection leta (`Microsoft.Data.SqlClient`
   driver, TDS protocol, locally shared-memory).
3. Windows auth → aapka Windows token bhejta, SQL Server verify karta.
4. Query chalti, rows aate, EF unhe entity objects banata.
5. Connection wapas pool me (band nahi, reuse).

**Aapne manually kabhi connect/disconnect nahi likha** — EF + pooling automatic.

### 8.3 SQL Server engine

- Windows service: `MSSQL$SQLEXPRESS`, PC ke saath auto-start.
- Data: `C:\Program Files\Microsoft SQL Server\...\MSSQL\DATA\OnlineStore.mdf` (+ `.ldf` log).
- Dekhne ke liye: **SSMS** ya **Azure Data Studio** → `localhost\SQLEXPRESS` (Windows auth).
- CLI: `sqlcmd -S "localhost\SQLEXPRESS" -d OnlineStore -E -Q "SELECT COUNT(*) FROM Products"`

---

## 9. HTML Se Zyada TypeScript Pe Focus Kyun

Ye **framework philosophy** hai: "logic TS me, template sirf declarative binding".

**Template ka kaam:** "ye data yahan dikhao, ye event pe ye method chalao".

```html
<div class="row row-cols-2 row-cols-md-3 g-3">
  @for (p of r.items; track p.id) {
    <div class="col"><app-product-card [product]="p" /></div>
  }
</div>
<app-pagination [page]="r.page" [totalPages]="r.totalPages" (pageChange)="setPage($event)" />
```

**Asal kaam TS me:** filter state, effect se re-fetch, `toNumber()` sanitize,
validation, API calls, toast feedback.

**Faida:** logic testable, types se compile-time galti (`p.pric` → build fail),
template chhota/readable, logic reusable.

---

## 10. CSS / Bootstrap Architecture

### 10.1 Bootstrap 5, re-skinned (Tailwind/Material nahi — user ne "html css bootstrap" kaha)

`angular.json` me wired:

```json
"styles": [
  "node_modules/bootstrap/dist/css/bootstrap.min.css",
  "node_modules/bootstrap-icons/font/bootstrap-icons.css",
  "src/styles.css"
],
"scripts": ["node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"]
```

Bootstrap layout/components deta (grid, cards, modals, dropdowns, forms). JS bundle
dropdown/toast/collapse ke liye.

### 10.2 Palette override — Bootstrap CSS variables (`src/styles.css`)

Bootstrap 5.3 CSS variables use karta hai — hum unhe apni palette se remap karte:

```css
:root {
  --c-teal:  #0f3040;  --c-slate: #464858;
  --c-clay:  #a56f63;  --c-sand:  #d99b7f;

  /* Bootstrap theme remap */
  --bs-primary: var(--c-teal);
  --bs-primary-rgb: 15, 48, 64;
  --bs-body-bg: #f6f4f1;
  --bs-link-color: var(--c-teal-500);
  --bs-border-radius: 0.6rem;
}
.btn-primary { --bs-btn-bg: var(--c-teal); --bs-btn-hover-bg: var(--c-teal-600); ... }
.btn-accent  { --bs-btn-bg: var(--c-clay); ... }        /* Bootstrap me nahi — humne banaya */
.text-brand { color: var(--c-teal) !important; }
```

**Faida:** poora theme = ye 30 lines. Component templates me `#0f3040` hardcode
nahi — hamesha `btn-primary` / `text-brand` / `--c-teal`.

### 10.3 App shell CSS + ek asli bug ki kahani

```css
.shell-header { height: 60px; background: var(--c-teal); }
/* white sirf header ke apne links pe — inherit se nahi */
.shell-header .shell-header__link, .shell-header .btn.text-white { color: #fff; }
```

**Bug jo aaya tha:** pehle `.shell-header { color: #fff }` tha. Header ke andar
Bootstrap ka `.dropdown-menu` (white background) bhi aata hai — usne white text
**inherit** kar li → white-on-white, invisible. **Fix:** header pe `color`
inherit set na karo, sirf specific elements ko white do. Lesson: CSS `color`
inherit karta hai — dark container ke andar light panel ho to explicit rakho.

### 10.4 Responsive

**(a) Bootstrap grid** — `row-cols-2 row-cols-md-3 row-cols-xl-4` = mobile pe 2
column, tablet 3, bara screen 4. Koi custom media query nahi.

**(b) Off-canvas sidebar** — desktop pe sidebar fixed dikhta, mobile pe hamburger:

```css
@media (max-width: 991.98px) {
  .shell-sidebar {
    position: fixed; inset: 60px auto 0 0; z-index: 1045;
    transform: translateX(-100%); transition: transform .25s ease;
  }
  .shell-sidebar.open { transform: none; }   /* signal `sidebarOpen()` toggle karta */
}
```

**(c) Overflow rule** — wide tables apne container me scroll (`.table-responsive`),
page kabhi horizontal scroll nahi karta.

### 10.5 Charts — dependency-free SVG (`shared/ui/bar-chart.ts`)

Koi Chart.js nahi. `TimeSeriesPoint[]` leta, `computed()` se bars ka geometry
nikaalta, inline `<svg>` render karta, `<title>` pe hover value. Light + theme-aware
(`fill="var(--c-teal)"`).

### 10.6 Generated images (`server/Services/ProductImage.cs`)

Product/store images external host (picsum etc.) pe depend nahi karte — backend
har product ke liye **SVG data-URI** banata (palette gradient + 2-letter monogram
+ naam), base64-encoded. Network chahe ya na ho, hamesha render. Vendor apni asli
`.jpg`/`.png` URL bhi de sakta; galat/missing pe `fallback-img.directive.ts`
placeholder dikhata.

---

## 11. Line-by-Line: Ek Feature (`features/customer/product-list/`)

### `product-list.ts`

```ts
export class ProductListComponent {
  private readonly catalog = inject(CatalogService);
  private readonly route   = inject(ActivatedRoute);

  // route ?category= / ?search= ko signal banao
  private readonly routeQuery = toSignal(
    this.route.queryParamMap.pipe(map(p => ({ category: p.get('category') ?? '', search: p.get('search') ?? '' }))),
    { initialValue: { category: '', search: '' } },
  );

  protected readonly result  = signal<PagedResult<ProductSummary> | null>(null);
  protected readonly loading = signal(true);

  // local filter state — sab signals
  protected readonly page      = signal(1);
  protected readonly sort      = signal<Sort>('newest');
  protected readonly brand     = signal('');
  protected readonly minRating = signal(0);
  protected readonly priceMin  = signal<number | null>(null);
  protected readonly priceMax  = signal<number | null>(null);

  constructor() {
    this.catalog.categories().subscribe(c => this.categories.set(c));

    // route badle → filters reset + brand list reload
    effect(() => {
      const q = this.routeQuery();
      this.page.set(1); this.brand.set(''); this.priceMin.set(null); this.priceMax.set(null);
      this.catalog.filters(q.category || undefined).subscribe(f => this.filterMeta.set(f));
    });

    // koi bhi filter/route change → re-fetch (server-side pagination)
    effect(() => {
      const q: ProductQuery = {
        page: this.page(), pageSize: 12, sort: this.sort(),
        categorySlug: this.routeQuery().category || undefined,
        search: this.routeQuery().search || undefined,
        brand: this.brand() || undefined, minRating: this.minRating() || undefined,
        minPrice: this.priceMin() ?? undefined, maxPrice: this.priceMax() ?? undefined,
      };
      this.loading.set(true);
      this.catalog.browse(q).subscribe({
        next: r => { this.result.set(r); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    });
  }

  protected setSort(v: string)   { this.sort.set(v as Sort); this.page.set(1); }
  protected setBrand(v: string)  { this.brand.set(v);        this.page.set(1); }
  protected setPage(p: number)   { this.page.set(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}
```

### `product-list.html` (key parts)

```html
<!-- sort -->
<select class="form-select form-select-sm w-auto" [value]="sort()" (change)="setSort($any($event.target).value)">
  <option value="newest">Newest</option>
  <option value="price_asc">Price: low to high</option>
  ...
</select>

<!-- filter sidebar -->
<aside class="col-lg-3" [class.d-none]="!filtersOpen()" [class.d-lg-block]="true">
  <div class="mb-3">
    <div class="fw-semibold small mb-1">Price ({{ filterMeta().minPrice }}–{{ filterMeta().maxPrice }})</div>
    <input type="number" class="form-control form-control-sm" placeholder="Min"
           [ngModel]="priceMin()" (ngModelChange)="priceMin.set($event)" />
    ...
    <button class="btn btn-sm btn-outline-primary" (click)="applyPrice()">Apply</button>
  </div>
</aside>

<!-- grid + pager -->
@if (loading()) { <app-spinner /> }
@else if (result(); as r) {
  @if (r.items.length === 0) { <app-empty-state icon="bi-search" title="No products match" /> }
  @else {
    <div class="row row-cols-2 row-cols-md-3 g-3">
      @for (p of r.items; track p.id) { <div class="col"><app-product-card [product]="p" /></div> }
    </div>
    <app-pagination [page]="r.page" [totalPages]="r.totalPages" (pageChange)="setPage($event)" />
  }
}
```

**Binding syntax:**

| Syntax | Matlab |
|---|---|
| `{{ x }}` | text interpolation |
| `[prop]="x"` | property binding (child ko value) |
| `(event)="fn()"` | event binding |
| `[(ngModel)]="x"` | two-way |
| `[class.foo]="cond"` | conditional class |
| `@if @for @else @empty` | Angular control flow (naya syntax) |
| `$any($event.target).value` | TS ko chup karane ke liye event target cast |

---

## 12. Line-by-Line: Ek Controller + Entity

### `OrdersController.SetStatus` (vendor order aage badhata)

```csharp
[Authorize(Roles = Roles.Vendor)]
[HttpPut("{id}/status")]                                       // PUT /api/orders/{id}/status
public async Task<ActionResult<OrderDto>> SetStatus(string id, OrderStatusRequest req)
{
    var vendor = await CurrentVendor();
    var order  = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
    if (order is null) return NotFound();
    if (order.VendorId != vendor.Id) return Forbid();          // apna order hi chhoo sakta

    // valid state machine
    var allowed = order.Status switch {
        OrderStatuses.Pending  => new[] { OrderStatuses.Accepted, OrderStatuses.Rejected },
        OrderStatuses.Accepted => new[] { OrderStatuses.Shipped },
        OrderStatuses.Shipped  => new[] { OrderStatuses.Delivered },
        _ => [],
    };
    if (!allowed.Contains(req.Status))
        return BadRequest(new { error = $"Can't move an order from {order.Status} to {req.Status}." });

    order.Status = req.Status;
    switch (req.Status) {
        case OrderStatuses.Accepted:  order.AcceptedAt  = DateTime.UtcNow; break;
        case OrderStatuses.Shipped:   order.ShippedAt   = DateTime.UtcNow; break;
        case OrderStatuses.Delivered: order.DeliveredAt = DateTime.UtcNow; break;
        case OrderStatuses.Rejected:  await RestockAsync(order); break;    // reject → stock wapas
    }
    await db.SaveChangesAsync();
    return await Reload(order.Id);
}
```

Frontend `order-management.ts` `nextActions(order)` isi state machine ka mirror
hai — sirf allowed buttons dikhata.

### `Order` entity (`Models/Entities.cs`)

```csharp
public class Order
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CustomerId { get; set; } = "";
    public string VendorId   { get; set; } = "";           // ek order = ek vendor (cart split)
    public string Status { get; set; } = OrderStatuses.Pending;
    public decimal Subtotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Total { get; set; }
    public decimal CommissionRate { get; set; }             // snapshot — baad me vendor rate badle to purane order na badlen
    public decimal CommissionAmount { get; set; }
    public string ShippingAddressJson { get; set; } = "";   // address ka snapshot (JSON) — address delete ho jaye to bhi order intact
    public string PaymentMethod { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }

    public AppUser? Customer { get; set; }
    public Vendor?  Vendor { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
```

### `AppDbContext` (relationships)

```csharp
b.Entity<Order>(e => {
    e.HasIndex(x => x.CustomerId);
    e.HasIndex(x => x.VendorId);
    e.HasIndex(x => x.Status);
    e.Property(x => x.Total).HasPrecision(18, 2);
    e.HasMany(x => x.Items).WithOne(x => x.Order!).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
});
b.Entity<RefreshToken>(e => {
    e.HasIndex(x => x.TokenHash);
    e.HasOne(x => x.User).WithMany(u => u.RefreshTokens).OnDelete(DeleteBehavior.Cascade);
});
```

---

## 13. Poori File Reference Table

### Frontend — core

| File | Kaam |
|---|---|
| `app.config.ts` | DI: router, `provideHttpClient(withInterceptors([auth, error]))`, app-initializer (meta + session + cart/wishlist) |
| `app.routes.ts` | Saare routes, lazy `loadComponent`, `{customer,vendor,admin}` guard spreads |
| `app.routes.server.ts` | `/app` + auth = Client render; storefront = Server (SSR) |
| `core/models/*` | TS interfaces — `PagedResult<T>`, `Product*`, `Cart`, `Order`, `Vendor`, `User`… |
| `core/services/auth.service.ts` | login/register/refresh/logout, `user` signal, `role`, `hasAnyRole`, `restore()` |
| `core/services/token.service.ts` | localStorage wrapper (access + refresh + user), SSR-safe try/catch |
| `core/services/cart.service.ts` | server cart signal, `count` computed (header badge), add/update/remove/clear |
| `core/services/wishlist.service.ts` | `Set<productId>` signal, `has()`, `toggle()`, `list()` |
| `core/services/catalog.service.ts` | categories, `browse(ProductQuery)`, `detail`, `related`, `filters`, vendor `mine`/create/update/remove |
| `core/services/order.service.ts` | `checkout`, `mine`/`forVendor`/`all` (paged), `detail`, `cancel`, `setStatus` |
| `core/services/address.service.ts` | address book CRUD |
| `core/services/review.service.ts` | `forProduct` (paged), `eligibility`, `create` |
| `core/services/vendor.service.ts` | `mine`/`updateStore`/`analytics`; admin `list`/`approve`/`reject`/`setCommission` |
| `core/services/admin.service.ts` | `users` (paged), `setBlocked`, `settings`, `analytics`, `disputes`, `resolveDispute` |
| `core/services/dispute.service.ts` | customer `mine` + `create` |
| `core/services/meta.service.ts` | `GET /api/meta` — currency symbol, shipping fee (public) |
| `core/services/notification.service.ts` | toast queue signal, `info/success/error`, auto-dismiss 5s |
| `core/services/http-params.ts` | `toParams(obj)` — null/''/undefined skip karke `HttpParams` |
| `core/guards/auth.guard.ts` | not logged in → `/login?returnUrl=` |
| `core/guards/role.guard.ts` | `data.allowedRoles` check → `/app/forbidden` |
| `core/guards/role-home.guard.ts` | `/app` → `homeRouteFor(user)` |
| `core/interceptors/auth.interceptor.ts` | Bearer attach + single-flight 401→refresh retry (`shareReplay`) |
| `core/interceptors/error.interceptor.ts` | non-401 HTTP error → toast |

### Frontend — shared / layout

| File | Kaam |
|---|---|
| `shared/pipes/money.pipe.ts` | `number` → `"Rs 18,999"` (impure — `MetaService` symbol) |
| `shared/directives/fallback-img.directive.ts` | broken img → inline SVG placeholder; `loading=lazy` |
| `shared/ui/product-card.ts` | grid card: wishlist heart, star rating, add-to-cart (Customer only) |
| `shared/ui/pagination.ts` | `[page] [totalPages] (pageChange)` — ellipsis logic |
| `shared/ui/star-rating.ts` | display + `editable` interactive stars |
| `shared/ui/bar-chart.ts` | inline SVG bar chart, no library |
| `shared/ui/spinner.ts` / `empty-state.ts` | loading / empty states |
| `shared/ui/order-status-badge.ts` | `OrderStatus` → coloured Bootstrap badge |
| `shared/ui/confirm.service.ts` + `confirm-dialog.ts` | `await confirm.ask('…', {danger})` promise modal |
| `layout/shell/shell.ts` + `.html` | top bar (cart/wishlist badge, user dropdown), off-canvas sidebar |
| `layout/shell/nav.ts` | `navFor(role)` → `NavSection[]` (Shop / My store / Administration / Account) |

### Frontend — features (har folder = ek route, lazy)

| Folder | Screen |
|---|---|
| `home/` | public storefront: hero + search, categories, popular products, footer |
| `auth/login/` `auth/signup/` | JWT login; signup Customer/Vendor toggle (signal), store-name field |
| `customer/shop/` | logged-in landing: search, category chips, new arrivals, top rated |
| `customer/product-list/` | filters (price/rating/brand/category), sort, **server pagination**, grid |
| `customer/product-detail/` | gallery, variant picker, qty, add-to-cart, reviews (paged + add), related |
| `customer/cart/` | store-wise grouped lines, qty ±, remove, shipping per store, totals |
| `customer/checkout/` | address book (add inline), payment (card form / COD), place order |
| `customer/order-history/` | paged list, status filter, thumbnails |
| `customer/order-detail/` | tracking timeline, items, cancel (pending), raise complaint, review buttons |
| `customer/wishlist/` | saved products grid |
| `customer/addresses/` | address CRUD, default flag |
| `customer/disputes/` | my complaints list + admin response |
| `vendor/vendor-dashboard/` | revenue/orders KPIs, 30-day chart, recent orders, best sellers |
| `vendor/product-management/` | table (paged), create/edit modal (images `FormArray`, variants `FormArray`), delete |
| `vendor/order-management/` | table (paged, status filter), accept/reject/ship/deliver (state machine) |
| `vendor/vendor-analytics/` | daily (14d) + monthly (12m) revenue bar charts |
| `vendor/store-settings/` | name, description, logo/banner URL + live preview |
| `admin/admin-dashboard/` | GMV, commission, counts, monthly chart, top vendors, quick links |
| `admin/vendor-approval/` | pending/approved/rejected list, approve / reject-with-reason |
| `admin/category-management/` | category CRUD + icon picker |
| `admin/user-management/` | paged, role filter, search, block/unblock |
| `admin/order-oversight/` | every order, search + status filter, commission column |
| `admin/commission-settings/` | platform defaults form + per-vendor commission table |
| `admin/dispute-management/` | paged, resolve/reject with resolution note |
| `admin/admin-analytics/` | monthly GMV chart + top vendors table |
| `account/profile/` | edit name/phone/avatar, change password |
| `forbidden/` | 403 page |

### Backend

| File | Kaam |
|---|---|
| `Program.cs` | `AddControllers`, `AddDbContext(UseSqlServer)`, JWT bearer, CORS, `MigrateAsync` + `DbSeeder` |
| `appsettings.json` | connection string + `Jwt` (issuer, audience, key, lifetimes) |
| `Models/Entities.cs` | `AppUser, Vendor, Category, Product, ProductVariant, CartItem, WishlistItem, Order, OrderItem, Review, Address, Dispute, PlatformSetting, RefreshToken` (14) |
| `Data/AppDbContext.cs` | DbSets, keys, unique indexes, decimal precision, cascade rules |
| `Data/DbSeeder.cs` | idempotent startup demo data (accounts, catalogue, past orders, reviews) |
| `Dtos/Common.cs` | `PagedResult<T>`, `Paging.Normalize()` |
| `Dtos/AuthDtos.cs` | register/login/refresh/profile/password requests, `UserDto`, `AuthResponse` |
| `Dtos/CatalogDtos.cs` | `Category`, `Product{Summary,Detail}`, `ProductVariant`, `Review` DTOs + `ProductUpsertRequest` + mappers |
| `Dtos/CartDtos.cs` | `CartDto`, `CartLineDto`, add/update requests |
| `Dtos/OrderDtos.cs` | `AddressDto`, `OrderDto`, `OrderItemDto`, `CheckoutRequest`, `OrderStatusRequest` |
| `Dtos/VendorAdminDtos.cs` | `VendorDto`, analytics records, `AdminUserDto`, `DisputeDto`, `PlatformSettingDto` |
| `Services/TokenService.cs` | JWT access token + refresh token (SHA-256 hash, rotation) |
| `Services/Slug.cs` | `Slug.From()` / `Slug.Unique()` |
| `Services/ProductImage.cs` | `Gallery(name, store, catIndex)` → 3 SVG data-URI images |
| `Services/ControllerExtensions.cs` | `this.UserId()`, `this.UserRole()` from JWT claims |
| `Controllers/AuthController.cs` | register, login, refresh, logout, me, profile, password |
| `Controllers/CategoriesController.cs` | GET (public) + admin POST/PUT/DELETE |
| `Controllers/ProductsController.cs` | GET browse/filters/detail/related (public); vendor mine/create/update/delete |
| `Controllers/CartController.cs` | GET, add, update, remove, clear (Customer) |
| `Controllers/WishlistController.cs` | list, ids, toggle (Customer) |
| `Controllers/AddressesController.cs` | address CRUD + default handling |
| `Controllers/OrdersController.cs` | checkout (vendor split), mine/vendor/all (paged), detail, cancel, status |
| `Controllers/ReviewsController.cs` | product reviews (paged), eligibility (delivered purchase), create + rating recompute |
| `Controllers/VendorsController.cs` | public store; vendor me/update/analytics; admin list/approve/reject/commission |
| `Controllers/AdminController.cs` | users (paged), block, platform settings |
| `Controllers/DisputesController.cs` | customer create/mine; admin list (paged) + resolve |
| `Controllers/AnalyticsController.cs` | vendor + admin analytics (revenue series, top products/vendors) |
| `Controllers/MetaController.cs` | public platform config (currency, shipping) |
| `Migrations/*_Init.cs` | auto-generated schema (14 tables) |

---

## 14. Commands Cheat Sheet

```bash
# Development (dono ek saath)
npm run dev

# Alag alag
npm run api        # C# API   → :5103   (auto-migrate + seed on first run)
npm start          # Angular  → :4200

# Build / test
npm run build
npm test -- --watch=false            # Vitest unit tests
dotnet build server

# Database
npm run db:update                                    # migrations apply
dotnet ef migrations add <Name> --project server     # entity change ke baad
dotnet ef database drop -f --project server          # DB delete → phir npm run api se fresh seed

# DB dekhna
sqlcmd -S "localhost\SQLEXPRESS" -d OnlineStore -E -Q "SELECT COUNT(*) FROM Orders"

# Ports free (agar "already in use")
npm run stop        # = kill-port 4200 5103

# Git
git add -A && git commit -m "message" && git push
```

### Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@onlinestore.test | Admin@123 |
| Customer | customer@onlinestore.test | Customer@123 |
| Customer | ayesha@onlinestore.test | Customer@123 |
| Vendor (approved) | vendor@onlinestore.test | Vendor@123 |
| Vendor (approved) | bilal@onlinestore.test | Vendor@123 |
| Vendor (approved) | sana@onlinestore.test | Vendor@123 |
| Vendor (pending) | pending@onlinestore.test | Vendor@123 |

---

## 15. Common Sawal

**Q: Admin account signup me kyun nahi?**
Security — koi khud ko admin na bana le. Admin sirf `DbSeeder` banata hai. Ya
manually SQL/seeder me add karo.

**Q: `/app/...` ka link kholo to blank/login pe aa jata hai (SSR)?**
`/app` client-render hai (localStorage-based JWT server pe nahi hota). Ye
expected hai — client bootstrap hote hi session restore + sahi page.

**Q: Browser SQL Server se connect nahi hota?**
Nahi. Browser sirf HTTP. API (C#) SQL Server se baat karti, browser API se JSON.

**Q: Product images kahan se aati hain?**
Seeded products ki images **backend generate karta** (SVG data-URI, `ProductImage.cs`).
Vendor apni asli image URL de sakta hai. Galat/YouTube link → placeholder.

**Q: Data kahan "asli" me save hota?**
`...\MSSQL\DATA\OnlineStore.mdf` — disk pe. App band karo, PC restart, data wahin.

**Q: "Fix the highlighted fields" aata tha lekin kuch highlight nahi hota tha?**
Wo bug tha — number field me comma ("1,23000") se `type=number` value khali kar
deta tha, aur invalid CSS nahi thi. Ab: fields `type=text` + `toNumber()` comma
strip karta + red border + `"Please check: Price, Stock."` exact naam ke saath.

**Q: Naya field add karna hai (e.g. Product me `weight`)?**
1. `server/Models/Entities.cs` → `Product` me `public decimal Weight { get; set; }`
2. `dotnet ef migrations add AddProductWeight --project server`
3. `npm run db:update`
4. `server/Dtos/CatalogDtos.cs` → `ProductDetailDto` + `ProductUpsertRequest` + mapper
5. `server/Controllers/ProductsController.cs` → create/update me set
6. `src/app/core/models/catalog.model.ts` → interface me add
7. `src/app/features/vendor/product-management/*` → form field + `save()` payload

**Q: Order lifecycle?**
`Pending` → (vendor) `Accepted` → `Shipped` → `Delivered`. Ya `Pending` → `Rejected`
(vendor) / `Cancelled` (customer). Reject/Cancel pe stock wapas. Review sirf
`Delivered` order ke product pe.

**Q: Commission kaise kaam karta?**
Har vendor ka `CommissionRate` (%). Checkout pe order me **snapshot** hota
(`order.CommissionRate` + `CommissionAmount = Subtotal × rate / 100`). Admin baad
me rate badle to purane orders nahi badalte. Admin analytics `CommissionEarned` =
sab earning orders ke `CommissionAmount` ka sum.
