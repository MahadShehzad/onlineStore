# onlineStore

A full multi-vendor marketplace (Customer / Vendor / Admin) — **Angular 22**
(standalone + signals, SSR) frontend, **.NET 10 Web API + EF Core + SQL Server**
backend, **Bootstrap 5** re-skinned with the project palette
(`#0F3040` `#464858` `#A56F63` `#D99B7F`). Mobile-first / responsive throughout.

## What's implemented

**Auth & accounts**
- JWT access token (15 min) + rotating refresh token (7 days, hashed in DB)
- Register / login / refresh / logout / me, profile edit, change password
- Role-based route guards (`authGuard`, `roleGuard`), role-aware app shell + nav
- HTTP interceptors: bearer attach + single-flight 401→refresh retry, global error toasts

**Customer**
- Storefront home, category browsing, **search + filters** (price, rating, brand, category), sort
- **Server-side pagination** on every product / order / admin list
- Product detail — image gallery, size/colour variants, related products
- Reviews & ratings (only after a delivered order), star widget
- Server-backed **cart** (grouped by store, live header badge), **wishlist**
- **Checkout** — address book (add inline), payment method, per-store shipping, order split by vendor
- Order history + **order tracking timeline**, cancel pending order
- Raise & track **complaints / disputes**

**Vendor**
- Dashboard with revenue/orders KPIs + charts + recent orders
- **Product CRUD** — images, variants, stock, activate/hide (soft-delete if ordered)
- **Order management** — accept / reject / ship / deliver with stock restock on reject
- **Sales analytics** — daily (14d) + monthly (12m) revenue bar charts, best sellers
- Store settings — name, description, logo, banner, live preview

**Admin**
- Platform overview (GMV, commission, counts) + charts + top vendors
- **Vendor approval** — approve / reject with reason
- **Category management** — CRUD with icon picker
- **User management** — search, role filter, block / unblock (revokes sessions)
- **Order oversight** — every order, search + status filter
- **Commission & fees** — platform defaults + per-vendor commission
- **Dispute handling** — resolve / reject with resolution notes
- Platform analytics

**Non-functional**
- Every feature route is lazy-loaded and role-guarded
- Reactive forms with validation; loading + empty + error states everywhere
- Lazy images with a placeholder fallback directive
- Dependency-free SVG bar-chart component
- Vitest unit tests + GitHub Actions CI (`.github/workflows/ci.yml`)

## Prerequisites

- Node 20+, .NET 10 SDK, `dotnet-ef` (`dotnet tool install -g dotnet-ef`)
- SQL Server at `localhost\SQLEXPRESS` — change the connection string in
  [server/appsettings.json](server/appsettings.json) if yours differs

## Run

```bash
npm install
npm run dev          # API :5103 + Angular :4200 together (proxied /api)
```

Separately: `npm run api` and `npm start`. The API auto-applies EF migrations and
seeds a full demo dataset (3 approved vendors + 1 pending, ~24 products, past
orders, reviews) on first start.

## Seeded accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@onlinestore.test | Admin@123 |
| Customer | customer@onlinestore.test | Customer@123 |
| Customer | ayesha@onlinestore.test | Customer@123 |
| Vendor (approved) | vendor@onlinestore.test | Vendor@123 |
| Vendor (approved) | bilal@onlinestore.test | Vendor@123 |
| Vendor (approved) | sana@onlinestore.test | Vendor@123 |
| Vendor (pending) | pending@onlinestore.test | Vendor@123 |

## Project layout

```
server/                        .NET 10 Web API
  Controllers/                  Auth, Categories, Products, Cart, Wishlist,
                                Addresses, Orders, Reviews, Vendors, Admin,
                                Disputes, Analytics, Meta
  Data/                         AppDbContext, DbSeeder, Migrations
  Models/Entities.cs            full schema
  Services/                     TokenService (JWT), Slug, extensions
  Dtos/                         request/response records + mappers
src/app/
  core/       models · services (catalog, cart, wishlist, order, address,
              review, vendor, admin, dispute, meta, auth, token, notification)
              guards · interceptors
  shared/     ui (product-card, pagination, star-rating, bar-chart, spinner,
              empty-state, confirm-dialog, order-status-badge) · pipes · directives
  layout/shell/   responsive shell + role nav catalogue
  features/   home · auth · customer/* · vendor/* · admin/* · account · forbidden
  app.routes.ts    lazy, role-guarded routes
```

## Not included (would be next)

- Real Stripe integration (checkout uses a simulated payment reference)
- Cloud image upload (products/stores take image URLs)
- E2E tests (Cypress), production deployment manifests
