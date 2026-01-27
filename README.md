# SimchoClock – Watch Distribution Recommendations Server

A Node.js server that provides an API layer and logistics data for "SimchoClock", a watch distribution recommendation engine. This document summarizes the current capabilities and outlines where the system is expected to evolve.

## Current Features

- **Service Health**: `GET /health` → `{ ok: true }` for server health checks.
- **Logistics Reports**
  - `GET /api/logistics/daily` – Extended daily view of inventory and shortages with filtering by `status` (`SAFE` / `CRITICAL` / `DEAD_STOCK`).
  - `GET /api/logistics/risk60d` – Identification of products at risk of shortage in the next 60 days.
  - `GET /api/logistics/reorder` – Order recommendations prioritized by risk level and status.
- **Logistics Configuration**
  - `GET /api/logistics-config` – Fetch current configuration (forecast windows, safety stock parameters, risk windows, dead stock thresholds).
  - `PATCH /api/logistics-config` – Update one or more configuration values with validation.
- **ROP Override Management**
  - `POST /api/overrides` – Create an Override for ROP or order quantity with optional reason; cancels any previous active Override for the same product.
  - `PATCH /api/overrides/:id/disable` – Disable an existing Override.
- **Purchase Orders**
  - `GET /api/purchase-orders` – View recent purchase orders (up to 200 most recent).
  - `POST /api/purchase-orders` – Open a new purchase order with required quantity and optional estimated arrival date.
- **Inventory Updates**
  - `PATCH /api/inventory/:productId` – Update or insert inventory levels (`onHand`, `reserved`, `inTransit`) with upsert and count timestamp preservation.
- **Sales Reports**
  - `GET /api/sales/report` – Report rows with filtering, pagination, and sorting (budget + JSON filters).
  - `GET /api/sales/report/export?format=csv` – Export report as CSV.
  - `GET /api/sales/report/filters` – Metadata for filter dropdowns (categories, brands, genders, materials, is_gold).
  - `GET /api/sales/report-presets` – List saved presets.
  - `POST /api/sales/report-presets` – Create a preset.
  - `DELETE /api/sales/report-presets/:id` – Delete a preset.

## API Reference (Full)

> All responses are JSON unless noted (CSV export).

### Health

**GET `/health`**

Response:
```json
{ "ok": true }
```

### Logistics Reports

**GET `/api/logistics/daily`**

Query params:
- `status` (optional): `SAFE` | `CRITICAL` | `DEAD_STOCK`

Response (example):
```json
[
  {
    "product_id": 1,
    "sku": "WATCH-001",
    "name": "Classic Watch",
    "lead_time_days": 12,
    "avg_daily_sales": 2.3,
    "forecast_daily_sales": 2.9,
    "rop_units": 45,
    "safety_stock_units": 10,
    "on_hand": 30,
    "reserved": 5,
    "in_transit": 12,
    "available": 25,
    "status": "CRITICAL",
    "min_order_qty": 10,
    "pack_size": 1,
    "is_dead_stock": false,
    "final_status": "CRITICAL"
  }
]
```

**GET `/api/logistics/risk60d`**

Response (example):
```json
[
  {
    "product_id": 1,
    "sku": "WATCH-001",
    "name": "Classic Watch",
    "forecast_daily_sales": 2.9,
    "available": 25,
    "rop_units": 45,
    "days_until_rop": -6.9,
    "at_risk_60d": true
  }
]
```

**GET `/api/logistics/reorder`**

Response (example):
```json
[
  {
    "product_id": 1,
    "sku": "WATCH-001",
    "name": "Classic Watch",
    "status": "CRITICAL",
    "at_risk_60d": true,
    "days_until_rop": -6.9,
    "rop_units": 45,
    "available": 25,
    "in_transit": 12,
    "target_units_30d": 97,
    "recommended_order_qty": 70
  }
]
```

### Logistics Configuration

**GET `/api/logistics-config`**

Response (example):
```json
{
  "id": true,
  "window_days_short": 7,
  "window_days_long": 30,
  "forecast_weight_short": 0.7,
  "forecast_weight_long": 0.3,
  "safety_stock_stats_days": 60,
  "service_level_z": 1.65,
  "reorder_coverage_days": 30,
  "risk_horizon_days": 60,
  "dead_stock_window_days": 30,
  "dead_stock_drop_min": 0.4,
  "dead_stock_drop_max": 0.6,
  "updated_at": "2024-09-01T10:00:00.000Z"
}
```

**PATCH `/api/logistics-config`**

Request body (example):
```json
{
  "windowDaysShort": 14,
  "forecastWeightShort": 0.6,
  "forecastWeightLong": 0.4,
  "riskHorizonDays": 45
}
```

Response (example):
```json
{
  "id": true,
  "window_days_short": 14,
  "window_days_long": 30,
  "forecast_weight_short": 0.6,
  "forecast_weight_long": 0.4,
  "safety_stock_stats_days": 60,
  "service_level_z": 1.65,
  "reorder_coverage_days": 30,
  "risk_horizon_days": 45,
  "dead_stock_window_days": 30,
  "dead_stock_drop_min": 0.4,
  "dead_stock_drop_max": 0.6,
  "updated_at": "2024-09-01T10:00:00.000Z"
}
```

### Override Management

**POST `/api/overrides`**

Request body (example):
```json
{
  "productId": 1,
  "overrideRopUnits": 50,
  "overrideOrderQty": 100,
  "reason": "Seasonal spike"
}
```

Response (example):
```json
{
  "id": 10,
  "product_id": 1,
  "override_rop_units": 50,
  "override_order_qty": 100,
  "reason": "Seasonal spike",
  "is_active": true,
  "created_at": "2024-09-01T10:00:00.000Z"
}
```

**PATCH `/api/overrides/:id/disable`**

Response (example):
```json
{
  "id": 10,
  "product_id": 1,
  "override_rop_units": 50,
  "override_order_qty": 100,
  "reason": "Seasonal spike",
  "is_active": false,
  "created_at": "2024-09-01T10:00:00.000Z"
}
```

### Purchase Orders

**GET `/api/purchase-orders`**

Response (example):
```json
[
  {
    "id": 99,
    "product_id": 1,
    "qty_ordered": 200,
    "expected_arrival": "2024-09-20",
    "status": "ORDERED",
    "order_date": "2024-09-01",
    "created_at": "2024-09-01T10:00:00.000Z"
  }
]
```

**POST `/api/purchase-orders`**

Request body (example):
```json
{
  "productId": 1,
  "qtyOrdered": 200,
  "expectedArrival": "2024-09-20"
}
```

Response (example):
```json
{
  "id": 99,
  "product_id": 1,
  "qty_ordered": 200,
  "expected_arrival": "2024-09-20",
  "status": "ORDERED",
  "order_date": "2024-09-01",
  "created_at": "2024-09-01T10:00:00.000Z"
}
```

### Inventory Updates

**PATCH `/api/inventory/:productId`**

Request body (example):
```json
{
  "onHand": 50,
  "reserved": 5,
  "inTransit": 10
}
```

Response (example):
```json
{
  "product_id": 1,
  "on_hand": 50,
  "reserved": 5,
  "in_transit": 10,
  "last_counted_at": "2024-09-01T10:00:00.000Z",
  "updated_at": "2024-09-01T10:00:00.000Z"
}
```

### Sales Reports

**GET `/api/sales/report`**

Query params:
- `budget` (optional number)
- `filters` (optional JSON string)
- `inStockOnly` (optional boolean, default `true`)
- `sort` (optional string: `score:desc`, `available:asc`, `price:asc`, `name:asc`)
- `page` (optional number, default `1`)
- `pageSize` (optional number, default `20`)

Response (example):
```json
{
  "rows": [
    {
      "product_id": 123,
      "sku": "GOLD-001",
      "name": "Gold Watch",
      "category": "watches",
      "list_price": 1999,
      "currency": "ILS",
      "image_url": "https://cdn.example.com/gold-watch.png",
      "available": 12,
      "score": 3.42
    }
  ],
  "total": 58,
  "appliedFilters": {
    "budget": 2500,
    "filters": {
      "gender": "women",
      "material": "gold"
    },
    "inStockOnly": true,
    "sort": { "field": "score", "direction": "desc" },
    "page": 1,
    "pageSize": 20
  }
}
```

**GET `/api/sales/report/export?format=csv`**

Returns a CSV file with columns:
`product_id, sku, name, category, list_price, currency, image_url, available, score`

**GET `/api/sales/report/filters`**

Response (example):
```json
{
  "categories": ["watches", "accessories"],
  "brands": ["Rolex", "Omega"],
  "genders": ["men", "women"],
  "materials": ["gold", "steel"],
  "is_gold": ["true", "false"]
}
```

**GET `/api/sales/report-presets`**

Response (example):
```json
[
  {
    "id": 7,
    "name": "Gold women under 2500",
    "budget": 2500,
    "filters": {
      "gender": "women",
      "material": "gold"
    },
    "created_at": "2024-09-01T10:00:00.000Z"
  }
]
```

**POST `/api/sales/report-presets`**

Request body (example):
```json
{
  "name": "Gold women under 2500",
  "budget": 2500,
  "filters": {
    "gender": "women",
    "material": "gold"
  }
}
```

Response (example):
```json
{
  "id": 7,
  "name": "Gold women under 2500",
  "budget": 2500,
  "filters": {
    "gender": "women",
    "material": "gold"
  },
  "created_at": "2024-09-01T10:00:00.000Z"
}
```

**DELETE `/api/sales/report-presets/:id`**

Response (example):
```json
{
  "id": 7,
  "name": "Gold women under 2500",
  "budget": 2500,
  "filters": {
    "gender": "women",
    "material": "gold"
  },
  "created_at": "2024-09-01T10:00:00.000Z"
}
```

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
