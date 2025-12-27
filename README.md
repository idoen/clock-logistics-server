# SimchoClock – Watch Distribution Recommendations Server

A Node.js server that provides an API layer and logistics data for "SimchoClock", a watch distribution recommendation engine. This document summarizes the current capabilities and outlines where the system is expected to evolve.

## Current Features

- **Service Health**: `GET /health` → `{ ok: true }` for server health checks.
- **Logistics Reports**
  - `GET /api/logistics/daily` – Extended daily view of inventory and shortages with filtering by `status` (`SAFE` / `CRITICAL` / `DEAD_STOCK`).
  - `GET /api/logistics/risk60d` – Identification of products at risk of shortage in the next 60 days.
  - `GET /api/logistics/reorder` – Order recommendations prioritized by risk level and status.
- **ROP Override Management**
  - `POST /api/overrides` – Create an Override for ROP or order quantity with optional reason; cancels any previous active Override for the same product.
  - `PATCH /api/overrides/:id/disable` – Disable an existing Override.
- **Purchase Orders**
  - `GET /api/purchase-orders` – View recent purchase orders (up to 200 most recent).
  - `POST /api/purchase-orders` – Open a new purchase order with required quantity and optional estimated arrival date.
- **Inventory Updates**
  - `PATCH /api/inventory/:productId` – Update or insert inventory levels (`onHand`, `reserved`, `inTransit`) with upsert and count timestamp preservation.

## Architecture and Configuration

- **Technology**: Express + TypeScript with PostgreSQL connection via `pg`.
- **Entry File**: `src/server.ts` runs the application with a port defined in `PORT` (default 3000).
- **Database Connection**: Requires a `DATABASE_URL` environment variable in a `.env` file (loaded via `dotenv`).
- **Middleware**: Centralized error handling that returns 500 for unexpected failures.

### Local Development

1. Install dependencies: `npm install`.
2. Create a `.env` file with `DATABASE_URL=postgres://...`.
3. Development: `npm run dev` (ts-node-dev with reload). Production: `npm run build` then `npm start`.

## Planned Future Additions

Based on the complete user stories defined:

- **Sales Manager**: Targeted inventory suggestions for store owners with budget limits (up to 15% of store budget), handling new stores via a "best sellers" list, and duplicate filtering to avoid suggesting items purchased in the last 30 days.
- **Marketing Manager**: Weekly report to identify brand gaps (gaps exceeding 30% compared to regional average) with automatic demographic explanations and contact export capability for campaign management.
- **Logistics Manager**: Smart inventory shortage forecasting with seasonality factor and lead time consideration, dead stock alerts (40–60% decrease in sales rate), and at-risk product lists.
- **Store Owner**: Personal area for viewing inventory proposals, approval or rejection with quantity editing; real-time dynamic cart calculation, mandatory rejection reason collection, and credit limit check that blocks exceptional approvals.

## Known Issues and Current Limitations

- No identity/permission management, user interface, or recommendation calculation mechanisms yet – the API relies on data from PostgreSQL (e.g., existing views and CTEs).
- No domain-layer validation beyond basic field checks (e.g., `quantity > 0` validation).
