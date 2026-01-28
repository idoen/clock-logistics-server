-- 03_mock_watch_store.sql
-- Mock/seed data for the Agile Logistics schema, adapted to a watch store.
-- Run AFTER 01_schema_full.sql and 02_views_full.sql

BEGIN;
SET search_path TO logistics, public;

-- Clean existing data (safe to run repeatedly)
TRUNCATE TABLE
  customer_order_lines, customer_orders, customers, sales_report_presets,
  logistic_overrides, purchase_orders, sales_history, inventory_levels, product_features, products, suppliers
RESTART IDENTITY CASCADE;

-- Single-row configuration (used by views)
INSERT INTO logistics_config (
  id,
  window_days_short, window_days_long,
  forecast_weight_short, forecast_weight_long,
  safety_stock_stats_days, service_level_z,
  reorder_coverage_days, risk_horizon_days,
  dead_stock_window_days, dead_stock_drop_min, dead_stock_drop_max
) VALUES (
  TRUE,
  7, 30,
  0.700, 0.300,
  60, 1.650,
  30, 60,
  30, 0.400, 0.600
)
ON CONFLICT (id) DO UPDATE SET
  window_days_short       = EXCLUDED.window_days_short,
  window_days_long        = EXCLUDED.window_days_long,
  forecast_weight_short   = EXCLUDED.forecast_weight_short,
  forecast_weight_long    = EXCLUDED.forecast_weight_long,
  safety_stock_stats_days = EXCLUDED.safety_stock_stats_days,
  service_level_z         = EXCLUDED.service_level_z,
  reorder_coverage_days   = EXCLUDED.reorder_coverage_days,
  risk_horizon_days       = EXCLUDED.risk_horizon_days,
  dead_stock_window_days  = EXCLUDED.dead_stock_window_days,
  dead_stock_drop_min     = EXCLUDED.dead_stock_drop_min,
  dead_stock_drop_max     = EXCLUDED.dead_stock_drop_max,
  updated_at              = now();

-- Suppliers
INSERT INTO suppliers (id, name, lead_time_days) VALUES
  (1, 'Israel Watch Distribution Ltd.', 14),
  (2, 'Luxury Timepieces Importer', 30),
  (3, 'Smartwear Wholesale', 10),
  (4, 'Swatch & Fashion Watches Distributor', 7);

-- Products (watches)
INSERT INTO products (id, sku, name, category, supplier_id, is_active, list_price, currency, attributes, image_url) VALUES
  (1, 'W-SEI-PROSPX-001', 'Seiko Prospex ''SeaHunter 200''', 'Diver', 1, TRUE, 1790.00, 'ILS', '{"brand": "Seiko", "gender": "M", "material": "steel", "is_gold": false, "movement": "automatic", "case_size_mm": 42, "water_resistance_m": 200}'::jsonb, NULL),
  (2, 'W-CAS-GSHOCK-002', 'Casio G-Shock ''UrbanShock''', 'Sport', 1, TRUE, 649.00, 'ILS', '{"brand": "Casio", "gender": "UNISEX", "material": "resin", "is_gold": false, "movement": "quartz", "case_size_mm": 45, "water_resistance_m": 200}'::jsonb, NULL),
  (3, 'W-TIS-PRX-003', 'Tissot PRX 40mm', 'Sport', 4, TRUE, 1890.00, 'ILS', '{"brand": "Tissot", "gender": "M", "material": "steel", "is_gold": false, "movement": "quartz", "case_size_mm": 40, "water_resistance_m": 100}'::jsonb, NULL),
  (4, 'W-CIT-ECO-004', 'Citizen Eco-Drive ''SolarClassic''', 'Dress', 1, TRUE, 1490.00, 'ILS', '{"brand": "Citizen", "gender": "M", "material": "steel", "is_gold": false, "movement": "solar", "case_size_mm": 41, "water_resistance_m": 100}'::jsonb, NULL),
  (5, 'W-HAM-KHAKI-005', 'Hamilton Khaki Field Auto', 'Field', 1, TRUE, 2390.00, 'ILS', '{"brand": "Hamilton", "gender": "M", "material": "steel", "is_gold": false, "movement": "automatic", "case_size_mm": 38, "water_resistance_m": 100}'::jsonb, NULL),
  (6, 'W-ORI-BAMB-006', 'Orient Bambino V2', 'Dress', 1, TRUE, 1190.00, 'ILS', '{"brand": "Orient", "gender": "M", "material": "leather", "is_gold": false, "movement": "automatic", "case_size_mm": 40, "water_resistance_m": 30}'::jsonb, NULL),
  (7, 'W-OMG-SEAM-007', 'Omega Seamaster 300M', 'Diver', 2, TRUE, 18900.00, 'ILS', '{"brand": "Omega", "gender": "M", "material": "steel", "is_gold": false, "movement": "automatic", "case_size_mm": 42, "water_resistance_m": 300}'::jsonb, NULL),
  (8, 'W-ROL-DJ-008', 'Rolex Datejust 41', 'Dress', 2, TRUE, 45900.00, 'ILS', '{"brand": "Rolex", "gender": "UNISEX", "material": "steel", "is_gold": false, "movement": "automatic", "case_size_mm": 41, "water_resistance_m": 100}'::jsonb, NULL),
  (9, 'W-APP-WATCH-009', 'Apple Watch Series (GPS) 45mm', 'Smartwatch', 3, TRUE, 1690.00, 'ILS', '{"brand": "Apple", "gender": "UNISEX", "material": "aluminum", "is_gold": false, "movement": "digital", "case_size_mm": 45, "water_resistance_m": 50}'::jsonb, NULL),
  (10, 'W-GAR-FENIX-010', 'Garmin Fenix (Multisport)', 'Smartwatch', 3, TRUE, 3190.00, 'ILS', '{"brand": "Garmin", "gender": "UNISEX", "material": "polymer", "is_gold": false, "movement": "digital", "case_size_mm": 47, "water_resistance_m": 100}'::jsonb, NULL),
  (11, 'W-FOS-HYB-011', 'Fossil Hybrid ''RetroFit''', 'Hybrid', 4, TRUE, 899.00, 'ILS', '{"brand": "Fossil", "gender": "UNISEX", "material": "steel", "is_gold": false, "movement": "hybrid", "case_size_mm": 44, "water_resistance_m": 50}'::jsonb, NULL),
  (12, 'W-SWT-COLOR-012', 'Swatch ''ColorPop''', 'Casual', 4, TRUE, 419.00, 'ILS', '{"brand": "Swatch", "gender": "UNISEX", "material": "plastic", "is_gold": false, "movement": "quartz", "case_size_mm": 41, "water_resistance_m": 30}'::jsonb, NULL),
  (13, 'W-LON-HC-013', 'Longines HydroConquest', 'Diver', 4, TRUE, 6490.00, 'ILS', '{"brand": "Longines", "gender": "M", "material": "steel", "is_gold": false, "movement": "automatic", "case_size_mm": 41, "water_resistance_m": 300}'::jsonb, NULL),
  (14, 'W-TAG-CARR-014', 'TAG Heuer Carrera Chronograph', 'Chronograph', 2, TRUE, 15900.00, 'ILS', '{"brand": "TAG Heuer", "gender": "M", "material": "steel", "is_gold": false, "movement": "automatic", "case_size_mm": 44, "water_resistance_m": 100}'::jsonb, NULL),
  (15, 'W-CAR-TANKG-015', 'Cartier Tank (Yellow Gold)', 'Dress', 2, TRUE, 37900.00, 'ILS', '{"brand": "Cartier", "gender": "F", "material": "gold", "is_gold": true, "movement": "quartz", "case_size_mm": 29, "water_resistance_m": 30}'::jsonb, NULL);

-- Product features (ordering policy knobs + costs)
INSERT INTO product_features (product_id, safety_stock_units, order_cost, holding_cost_per_unit_per_day, min_order_qty, pack_size) VALUES
  (1, 0, 55.00, 0.800000, 3, 1),
  (2, 0, 45.00, 0.250000, 6, 2),
  (3, 2, 60.00, 0.850000, 2, 1),
  (4, 0, 50.00, 0.600000, 2, 1),
  (5, 0, 55.00, 0.700000, 2, 1),
  (6, 0, 45.00, 0.450000, 3, 1),
  (7, 1, 120.00, 4.500000, 1, 1),
  (8, 1, 150.00, 7.500000, 1, 1),
  (9, 0, 40.00, 0.550000, 5, 1),
  (10, 0, 45.00, 0.950000, 3, 1),
  (11, 0, 35.00, 0.300000, 6, 2),
  (12, 0, 30.00, 0.150000, 10, 5),
  (13, 0, 70.00, 1.800000, 1, 1),
  (14, 1, 110.00, 3.800000, 1, 1),
  (15, 1, 130.00, 6.500000, 1, 1);

-- Inventory levels (on-hand / reserved). Note: views derive in-transit from purchase_orders.
INSERT INTO inventory_levels (product_id, on_hand, reserved, in_transit, last_counted_at) VALUES
  (1, 22, 4, 0, now() - interval '2 days'),
  (2, 60, 6, 0, now() - interval '2 days'),
  (3, 10, 1, 0, now() - interval '2 days'),
  (4, 14, 2, 0, now() - interval '2 days'),
  (5, 8, 1, 0, now() - interval '2 days'),
  (6, 18, 3, 0, now() - interval '2 days'),
  (7, 2, 0, 0, now() - interval '2 days'),
  (8, 1, 0, 0, now() - interval '2 days'),
  (9, 1, 1, 0, now() - interval '2 days'),
  (10, 6, 0, 0, now() - interval '2 days'),
  (11, 85, 2, 0, now() - interval '2 days'),
  (12, 140, 0, 0, now() - interval '2 days'),
  (13, 3, 0, 0, now() - interval '2 days'),
  (14, 2, 0, 0, now() - interval '2 days'),
  (15, 1, 0, 0, now() - interval '2 days');

-- Purchase orders: mix of RECEIVED (real lead time) and ORDERED (in transit)
INSERT INTO purchase_orders (id, product_id, order_date, expected_arrival, received_date, qty_ordered, status) VALUES
  (1, 1, (CURRENT_DATE - 110)::date, (CURRENT_DATE - 95)::date, (CURRENT_DATE - 96)::date, 30, 'RECEIVED'),
  (2, 2, (CURRENT_DATE - 80)::date, (CURRENT_DATE - 65)::date, (CURRENT_DATE - 66)::date, 80, 'RECEIVED'),
  (3, 6, (CURRENT_DATE - 55)::date, (CURRENT_DATE - 40)::date, (CURRENT_DATE - 41)::date, 40, 'RECEIVED'),
  (4, 3, (CURRENT_DATE - 45)::date, (CURRENT_DATE - 38)::date, (CURRENT_DATE - 39)::date, 12, 'RECEIVED'),
  (5, 12, (CURRENT_DATE - 35)::date, (CURRENT_DATE - 28)::date, (CURRENT_DATE - 29)::date, 200, 'RECEIVED'),
  (6, 10, (CURRENT_DATE - 40)::date, (CURRENT_DATE - 31)::date, (CURRENT_DATE - 32)::date, 8, 'RECEIVED'),
  (7, 7, (CURRENT_DATE - 120)::date, (CURRENT_DATE - 90)::date, (CURRENT_DATE - 92)::date, 3, 'RECEIVED'),
  (8, 14, (CURRENT_DATE - 95)::date, (CURRENT_DATE - 65)::date, (CURRENT_DATE - 67)::date, 2, 'RECEIVED'),
  (9, 1, (CURRENT_DATE - 5)::date, (CURRENT_DATE + 9)::date, NULL, 18, 'ORDERED'),
  (10, 9, (CURRENT_DATE - 3)::date, (CURRENT_DATE + 7)::date, NULL, 20, 'ORDERED'),
  (11, 7, (CURRENT_DATE - 10)::date, (CURRENT_DATE + 25)::date, NULL, 2, 'ORDERED'),
  (12, 15, (CURRENT_DATE - 8)::date, (CURRENT_DATE + 28)::date, NULL, 1, 'ORDERED');

-- Overrides: manual ROP/order quantity adjustments
INSERT INTO logistic_overrides (id, product_id, override_rop_units, override_order_qty, reason, is_active, created_at) VALUES
  (1, 1, 14, NULL, 'Marketing push on divers; keep higher buffer', TRUE, now() - interval '20 days'),
  (2, 1, 16, NULL, 'Update after 2 weeks sales spike', TRUE, now() - interval '2 days'),
  (3, 9, 6, 20, 'Smartwatch promo: pre-order batch', TRUE, now() - interval '5 days'),
  (4, 11, NULL, 0, 'Do not reorder dead stock (manual hold)', FALSE, now() - interval '40 days');

-- Sales history: 120 days, 2 channels (store + online)
-- Patterns are deterministic (based on date) so results are stable across runs.
WITH dates AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '120 days',
    CURRENT_DATE - INTERVAL '1 day',
    INTERVAL '1 day'
  )::date AS sale_date
),
base AS (
  SELECT p.id AS product_id, d.sale_date
  FROM products p
  CROSS JOIN dates d
)
INSERT INTO sales_history (product_id, sale_date, qty_sold, channel)
SELECT
  b.product_id,
  b.sale_date,
  GREATEST(0,
    CASE
      WHEN b.product_id IN (1,2) THEN
        CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 6) IN (0,1) THEN 4 ELSE 3 END
      WHEN b.product_id IN (4,5,6,12) THEN
        CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 10) = 0 THEN 2 ELSE 1 END
      WHEN b.product_id IN (7,8,14,15) THEN
        CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 18) = 0 THEN 1 ELSE 0 END
      WHEN b.product_id IN (9,10) THEN
        CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 7) IN (0,1) THEN 2 ELSE 1 END
      WHEN b.product_id = 11 THEN
        CASE
          WHEN b.sale_date > (CURRENT_DATE - 60) AND b.sale_date <= (CURRENT_DATE - 30)
            THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 5) = 0 THEN 3 ELSE 2 END
          WHEN b.sale_date > (CURRENT_DATE - 30)
            THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 5) = 0 THEN 2 ELSE 1 END
          ELSE 1
        END
      WHEN b.product_id IN (3,13) THEN
        CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 9) = 0 THEN 2 ELSE 1 END
      ELSE 0
    END
  )::int AS qty_sold,
  'store' AS channel
FROM base b;

WITH dates AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '120 days',
    CURRENT_DATE - INTERVAL '1 day',
    INTERVAL '1 day'
  )::date AS sale_date
),
base AS (
  SELECT p.id AS product_id, d.sale_date
  FROM products p
  CROSS JOIN dates d
)
INSERT INTO sales_history (product_id, sale_date, qty_sold, channel)
SELECT
  b.product_id,
  b.sale_date,
  GREATEST(0,
    CASE
      WHEN b.product_id IN (1,2) THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 7) IN (0,1,2) THEN 2 ELSE 1 END
      WHEN b.product_id IN (4,5,6,12) THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 12) = 0 THEN 1 ELSE 0 END
      WHEN b.product_id IN (7,8,14,15) THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 30) = 0 THEN 1 ELSE 0 END
      WHEN b.product_id IN (9,10) THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 6) IN (0,1,2) THEN 3 ELSE 2 END
      WHEN b.product_id = 11 THEN
        CASE
          WHEN b.sale_date > (CURRENT_DATE - 60) AND b.sale_date <= (CURRENT_DATE - 30)
            THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 6) = 0 THEN 2 ELSE 1 END
          WHEN b.sale_date > (CURRENT_DATE - 30)
            THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 6) = 0 THEN 1 ELSE 0 END
          ELSE 0
        END
      WHEN b.product_id IN (3,13) THEN CASE WHEN (EXTRACT(DOY FROM b.sale_date)::int % 14) = 0 THEN 1 ELSE 0 END
      ELSE 0
    END
  )::int AS qty_sold,
  'online' AS channel
FROM base b;

-- Customers & orders (optional CRM/B2B layer)
INSERT INTO customers (id, name, type, default_budget, notes) VALUES
  (1, 'Jerusalem Watch Boutique', 'STORE', 8000.00, 'Retail store - medium budget'),
  (2, 'Tel Aviv Reseller (B2B)', 'RESELLER', 25000.00, 'Buys in bulk; asks for discounts'),
  (3, 'VIP Customer: Ido', 'VIP', 45000.00, 'Prefers classic steel, also interested in gold pieces');

INSERT INTO customer_orders (id, customer_id, status, created_at) VALUES
  (1, 1, 'FULFILLED', now() - interval '12 days'),
  (2, 2, 'SUBMITTED', now() - interval '3 days'),
  (3, 3, 'DRAFT', now() - interval '1 days');

INSERT INTO customer_order_lines (id, order_id, product_id, qty, unit_price) VALUES
  (1, 1, 2, 10, 599.00),
  (2, 1, 12, 30, 349.00),
  (3, 2, 1, 5, 1690.00),
  (4, 2, 3, 3, 1790.00),
  (5, 3, 15, 1, 36900.00);

-- Report presets (budget + JSON filters)
INSERT INTO sales_report_presets (id, name, budget, filters) VALUES
  (1, 'Budget Divers (<= 7,000 ILS)', 7000.00, '{"category": "Diver"}'::jsonb),
  (2, 'Gold Watches', NULL, '{"is_gold": "true"}'::jsonb),
  (3, 'Smartwatches under 3,500', 3500.00, '{"category": "Smartwatch"}'::jsonb);

-- Keep sequences in sync (in case future inserts omit explicit IDs)
SELECT setval(pg_get_serial_sequence('suppliers','id'),            (SELECT COALESCE(MAX(id),1) FROM suppliers), true);
SELECT setval(pg_get_serial_sequence('products','id'),             (SELECT COALESCE(MAX(id),1) FROM products), true);
SELECT setval(pg_get_serial_sequence('sales_history','id'),        (SELECT COALESCE(MAX(id),1) FROM sales_history), true);
SELECT setval(pg_get_serial_sequence('purchase_orders','id'),      (SELECT COALESCE(MAX(id),1) FROM purchase_orders), true);
SELECT setval(pg_get_serial_sequence('logistic_overrides','id'),   (SELECT COALESCE(MAX(id),1) FROM logistic_overrides), true);
SELECT setval(pg_get_serial_sequence('customers','id'),            (SELECT COALESCE(MAX(id),1) FROM customers), true);
SELECT setval(pg_get_serial_sequence('customer_orders','id'),      (SELECT COALESCE(MAX(id),1) FROM customer_orders), true);
SELECT setval(pg_get_serial_sequence('customer_order_lines','id'), (SELECT COALESCE(MAX(id),1) FROM customer_order_lines), true);
SELECT setval(pg_get_serial_sequence('sales_report_presets','id'), (SELECT COALESCE(MAX(id),1) FROM sales_report_presets), true);

-- Optional sanity checks (uncomment for quick verification)
-- SELECT * FROM v_logistics_daily_ext ORDER BY status DESC, forecast_daily_sales DESC;
-- SELECT * FROM v_reorder_recommendations WHERE recommended_order_qty > 0 ORDER BY at_risk_60d DESC, recommended_order_qty DESC;
-- SELECT * FROM v_dead_stock WHERE is_dead_stock = TRUE;

COMMIT;