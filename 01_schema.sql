-- 01_schema.sql (NEW)
-- PostgreSQL schema for Agile Logistics R.O.P project (Dynamic version)
-- Run order:
--   1) 01_schema.sql
--   2) 02_views.sql
--   3) 03_seed.sql (update seed to include received_date where relevant)

BEGIN;

CREATE SCHEMA IF NOT EXISTS logistics;
SET search_path TO logistics, public;

-- Enums
DO $$ BEGIN
  CREATE TYPE stock_status AS ENUM ('SAFE', 'CRITICAL', 'DEAD_STOCK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE po_status AS ENUM ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Single-row configuration table (removes hard-coded thresholds from views)
CREATE TABLE IF NOT EXISTS logistics_config (
  id                        BOOLEAN PRIMARY KEY DEFAULT TRUE, -- always single row

  -- Forecast windows
  window_days_short         INT NOT NULL DEFAULT 7  CHECK (window_days_short > 0),
  window_days_long          INT NOT NULL DEFAULT 30 CHECK (window_days_long > 0),
  forecast_weight_short     NUMERIC(6,3) NOT NULL DEFAULT 0.700 CHECK (forecast_weight_short >= 0 AND forecast_weight_short <= 1),
  forecast_weight_long      NUMERIC(6,3) NOT NULL DEFAULT 0.300 CHECK (forecast_weight_long  >= 0 AND forecast_weight_long  <= 1),

  -- Safety stock stats
  safety_stock_stats_days   INT NOT NULL DEFAULT 60 CHECK (safety_stock_stats_days > 0),
  service_level_z           NUMERIC(6,3) NOT NULL DEFAULT 1.650 CHECK (service_level_z > 0),

  -- Risk / reorder policy
  reorder_coverage_days     INT NOT NULL DEFAULT 30 CHECK (reorder_coverage_days > 0),
  risk_horizon_days         INT NOT NULL DEFAULT 60 CHECK (risk_horizon_days > 0),

  -- Dead stock policy
  dead_stock_window_days    INT NOT NULL DEFAULT 30 CHECK (dead_stock_window_days > 0),
  dead_stock_drop_min       NUMERIC(6,3) NOT NULL DEFAULT 0.400 CHECK (dead_stock_drop_min >= 0 AND dead_stock_drop_min <= 1),
  dead_stock_drop_max       NUMERIC(6,3) NOT NULL DEFAULT 0.600 CHECK (dead_stock_drop_max >= 0 AND dead_stock_drop_max <= 1),

  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure weights sum to 1 (within small tolerance)
  CONSTRAINT forecast_weights_sum_one CHECK (
    abs((forecast_weight_short + forecast_weight_long) - 1.000) <= 0.001
  )
);

INSERT INTO logistics_config (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

-- Suppliers
-- NOTE: lead_time_days kept for compatibility, but views prefer dynamic lead time from POs.
CREATE TABLE IF NOT EXISTS suppliers (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  lead_time_days  INT NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id          BIGSERIAL PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT,
  supplier_id BIGINT REFERENCES suppliers(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product Features (user-editable controls + costs)
-- seasonality_coeff removed (forecast is now dynamic from sales_history)
CREATE TABLE IF NOT EXISTS product_features (
  product_id                    BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,

  -- user override: if > 0, used; if 0, views compute suggested safety stock dynamically
  safety_stock_units             INT NOT NULL DEFAULT 0 CHECK (safety_stock_units >= 0),

  order_cost                     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (order_cost >= 0),
  holding_cost_per_unit_per_day  NUMERIC(12,6) NOT NULL DEFAULT 0 CHECK (holding_cost_per_unit_per_day >= 0),

  min_order_qty                  INT NOT NULL DEFAULT 0 CHECK (min_order_qty >= 0),
  pack_size                      INT NOT NULL DEFAULT 1 CHECK (pack_size >= 1),

  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Levels (current state)
-- NOTE: in_transit column kept for compatibility, but views derive in_transit from purchase_orders
CREATE TABLE IF NOT EXISTS inventory_levels (
  product_id      BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  on_hand         INT NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved        INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  in_transit      INT NOT NULL DEFAULT 0 CHECK (in_transit >= 0),
  last_counted_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales History (daily)
CREATE TABLE IF NOT EXISTS sales_history (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_date  DATE NOT NULL,
  qty_sold   INT NOT NULL CHECK (qty_sold >= 0),
  channel    TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, sale_date, channel)
);

CREATE INDEX IF NOT EXISTS idx_sales_product_date
  ON sales_history(product_id, sale_date);

CREATE INDEX IF NOT EXISTS idx_sales_date
  ON sales_history(sale_date);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id               BIGSERIAL PRIMARY KEY,
  product_id       BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_arrival DATE,
  received_date    DATE, -- NEW (real)
  qty_ordered      INT NOT NULL CHECK (qty_ordered > 0),
  status           po_status NOT NULL DEFAULT 'ORDERED',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (received_date IS NULL OR received_date >= order_date)
);

CREATE INDEX IF NOT EXISTS idx_po_product_status
  ON purchase_orders(product_id, status);

CREATE INDEX IF NOT EXISTS idx_po_status_dates
  ON purchase_orders(status, order_date, received_date);

-- Trigger: stamp received_date automatically when status becomes RECEIVED
CREATE OR REPLACE FUNCTION trg_set_received_date()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'RECEIVED' AND NEW.received_date IS NULL THEN
    NEW.received_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_received_date ON purchase_orders;

CREATE TRIGGER set_received_date
BEFORE INSERT OR UPDATE OF status ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION trg_set_received_date();

-- Overrides (manual override from UI)
CREATE TABLE IF NOT EXISTS logistic_overrides (
  id                 BIGSERIAL PRIMARY KEY,
  product_id         BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  override_rop_units INT,
  override_order_qty INT,
  reason             TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overrides_active
  ON logistic_overrides(product_id, is_active);

-- ============================================================================
-- ADDITIONS (Sales report "cut" by budget + feature filters, and optional CRM)
-- NOTE: Additive-only changes (new columns/tables/indexes). No existing objects
--       are modified other than adding columns with IF NOT EXISTS.
-- ============================================================================

-- ----------------------------
-- Product commercial metadata
-- ----------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS list_price NUMERIC(12,2) CHECK (list_price IS NULL OR list_price >= 0),
  ADD COLUMN IF NOT EXISTS currency   CHAR(3) NOT NULL DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS image_url  TEXT;

CREATE INDEX IF NOT EXISTS idx_products_list_price
  ON products(list_price);

CREATE INDEX IF NOT EXISTS idx_products_attributes_gin
  ON products USING GIN (attributes);

-- ---------------------------------------
-- OPTIONAL (Future): customers + ordering
-- ---------------------------------------
DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('STORE', 'RESELLER', 'VIP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_order_status AS ENUM ('DRAFT', 'SUBMITTED', 'CANCELLED', 'FULFILLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS customers (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  type           customer_type NOT NULL DEFAULT 'STORE',
  default_budget NUMERIC(12,2) CHECK (default_budget IS NULL OR default_budget >= 0),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_type
  ON customers(type);

CREATE TABLE IF NOT EXISTS customer_orders (
  id          BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  status      customer_order_status NOT NULL DEFAULT 'DRAFT',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_status
  ON customer_orders(customer_id, status);

CREATE TABLE IF NOT EXISTS customer_order_lines (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products(id),
  qty         INT NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(12,2) CHECK (unit_price IS NULL OR unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_customer_order_lines_product
  ON customer_order_lines(product_id);

-- ---------------------------------------
-- OPTIONAL: save report presets (budget + filters)
-- ---------------------------------------
CREATE TABLE IF NOT EXISTS sales_report_presets (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  budget     NUMERIC(12,2) CHECK (budget IS NULL OR budget >= 0),
  filters    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
