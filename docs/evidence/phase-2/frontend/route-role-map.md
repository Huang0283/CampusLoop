# FE2-01 Route and Action Access Map

## Purpose

This document is the Phase 2 source of truth for two separate decisions:

- **Page access**: whether a visitor may open and browse a route.
- **Action access**: whether a visitor may execute an action inside that page.

A route must not be marked as login-only merely because one of its buttons requires an account.

## Public Routes

- `/`: public redirect to `/market`.
- `/market`: public product browsing, search, filter, sort, pagination, and product-card navigation.
- `/product/:id`: public product detail, image browsing, seller summary, and return-to-market navigation.
- `/wanted`: public wanted-list browsing, filter, sort, pagination, and wanted-card navigation.
- `/wanted/:id`: public wanted-detail browsing, match-summary viewing, and return navigation.
- `/login`, `/register`, `/403`, `/404`: public system routes.

## Protected Routes

- `/profile`: authenticated profile viewing and editing.
- `/favorites`: authenticated user's saved products.
- `/my-products`: authenticated user's product management.
- `/publish`, `/publish/price-advice`: authenticated product publishing and price-advice flow.
- `/wanted/publish`, `/wanted/matches`: authenticated wanted publishing and personalized matching.
- `/chat`, `/chat/:id`: authenticated private conversations.
- `/transactions`, `/transactions/:id`, `/transactions/:id/meetup`, `/transactions/:id/review`: authenticated transaction flow.
- `/notifications`: authenticated notifications.
- `/admin`: authenticated administrator only; a non-admin account goes to `/403`.

## Action Rules On Public Pages

- Product and wanted browsing actions remain available without a token.
- Favorite, contact seller/publisher, report product/user, publish product, publish wanted, and personalized matching require login.
- When a visitor activates a protected action, the frontend stores the current pathname, query, and hash in the login navigation state and routes to `/login`.
- After demo login, the visitor returns to the saved source route. Phase 3 must replace this demo behavior with the real authentication and authorization response.
- Resource-owner actions such as edit, delete, close, and take-down require both authentication and ownership; the route must not expose an owner action to another student's resource.

## Route Implementation Mapping

- Public browsing routes are declared without `RequireAuth` in `frontend/src/router/index.tsx`.
- Action-level login gating is centralized in `frontend/src/hooks/useRequireAuthAction.ts`.
- Market and wanted pages use the action guard for publish, favorite, contact, report, and personalized-match entry points.
- Private routes continue to use `RequireAuth`; `/admin` continues to compose `RequireAuth` and `RequireRole`.

## Acceptance Scenarios

1. With no `token`, open `/market`, `/product/101`, `/wanted`, and `/wanted/1`; each route remains on the requested page and displays browseable content.
2. With no `token`, click `发布商品`, `收藏`, `联系卖家/发布者`, `举报`, or `查看全部匹配`; the browser goes to `/login` and preserves the source route.
3. After demo student login from an action redirect, the browser returns to the preserved source route.
4. With no `token`, open `/chat`, `/transactions`, `/profile`, or `/notifications`; the browser goes to `/login`.
5. With a student token, open `/admin`; the browser goes to `/403`.

## Phase Boundary

Phase 2 proves the clickable prototype and the access decision. It does not prove real authentication, server-side authorization, persistence, or API enforcement. M5 owns the real token/role contract; M6 owns resource ownership and business authorization in Phase 3.
