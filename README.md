# onlineStore

A multi-vendor marketplace (Customer / Vendor / Admin) built with **Angular 22**
(standalone + signals) and a **.NET 10 Web API + EF Core + SQL Server** backend.
Styling is **Bootstrap 5** re-skinned with the project palette
(`#0F3040` `#464858` `#A56F63` `#D99B7F`).

## Status — Phase 1 complete

| Area | Delivered |
| --- | --- |
| Auth | JWT access (15 min) + refresh token (7 days, rotated, DB-stored) — register / login / refresh / logout / me |
| Guards | `authGuard`, `roleGuard` (per-route `allowedRoles`), `roleHomeGuard` |
| Frontend core | `TokenService`, `AuthService` (signals), auth + error HTTP interceptors, toast notifications |
| Layout | Responsive app shell — top bar, collapsible sidebar (off-canvas on mobile), role-aware nav |
| Pages | Public landing, login, signup (customer/vendor toggle), role dashboards (placeholders), profile, forbidden |
| Database | `Users, Vendors, Categories, Products, Orders, OrderItems, Reviews, Addresses, RefreshTokens` (full schema; only auth wired) + EF migration + startup seed |

Phases 2–8 (customer browsing & cart, checkout, vendor CRUD, admin tools,
Stripe, tests, deployment) are not started.

## Prerequisites

- Node 20+, .NET 10 SDK, `dotnet-ef` (`dotnet tool install -g dotnet-ef`)
- SQL Server reachable at `localhost\SQLEXPRESS` (change the connection string in
  [server/appsettings.json](server/appsettings.json) if yours differs)

## Run

```bash
npm install
npm run db:update      # apply EF migrations (also runs automatically on API start)
npm run dev            # API on :5103 + Angular on :4200 (proxied /api)
```

Or separately: `npm run api` and `npm start`.

## Seeded accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@onlinestore.test | Admin@123 |
| Customer | customer@onlinestore.test | Customer@123 |
| Vendor | vendor@onlinestore.test | Vendor@123 |

## Layout

```
server/                     .NET 10 Web API
  Controllers/AuthController.cs
  Data/ (AppDbContext, DbSeeder, Migrations)
  Models/Entities.cs
  Services/TokenService.cs   JWT + refresh-token issuing/rotation
  Dtos/AuthDtos.cs
src/app/
  core/         models, services (auth, token, notification), guards, interceptors
  layout/shell/ responsive app shell + nav catalogue
  features/     home, auth/(login,signup), customer, vendor, admin, account/profile, forbidden
  app.routes.ts lazy, guarded routes
```
