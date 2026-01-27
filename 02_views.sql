-- 02_views.sql (NEW)
-- Dynamic views for daily report (ROP + status), dead stock detection, risk, and reorder recommendations.

BEGIN;

SET search_path TO logistics, public;

-- Latest active override per product
CREATE OR REPLACE VIEW v_active_overrides AS
SELECT DISTINCT ON (product_id)
  product_id,
  override_rop_units,
  override_order_qty,
  reason,
  created_at
FROM logistic_overrides
WHERE is_active = TRUE
ORDER BY product_id, created_at DESC;

-- In-transit derived from Purchase Orders (ORDERED)
CREATE OR REPLACE VIEW v_po_in_transit AS
SELECT
  p.id AS product_id,
  COALESCE(SUM(po.qty_ordered) FILTER (WHERE po.status = 'ORDERED'), 0)::int AS in_transit_units,
  MIN(po.expected_arrival) FILTER (WHERE po.status = 'ORDERED') AS next_expected_arrival
FROM products p
LEFT JOIN purchase_orders po ON po.product_id = p.id
GROUP BY p.id;

-- Lead time estimate per supplier:
-- Prefer actual (RECEIVED: received_date - order_date), fallback to planned (ORDERED: expected_arrival - order_date),
-- then global medians, then supplier.lead_time_days as last resort.
CREATE OR REPLACE VIEW v_supplier_lead_time_est AS
WITH real_po AS (
  SELECT
    pr.supplier_id,
    (po.received_date - po.order_date) AS lt_days
  FROM purchase_orders po
  JOIN products pr ON pr.id = po.product_id
  WHERE pr.supplier_id IS NOT NULL
    AND po.status = 'RECEIVED'
    AND po.received_date IS NOT NULL
    AND po.received_date >= po.order_date
),
plan_po AS (
  SELECT
    pr.supplier_id,
    (po.expected_arrival - po.order_date) AS lt_days
  FROM purchase_orders po
  JOIN products pr ON pr.id = po.product_id
  WHERE pr.supplier_id IS NOT NULL
    AND po.status = 'ORDERED'
    AND po.expected_arrival IS NOT NULL
    AND po.expected_arrival >= po.order_date
),
real_med AS (
  SELECT
    supplier_id,
    CEIL(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lt_days))::int AS lt_real_med
  FROM real_po
  GROUP BY supplier_id
),
plan_med AS (
  SELECT
    supplier_id,
    CEIL(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lt_days))::int AS lt_plan_med
  FROM plan_po
  GROUP BY supplier_id
),
global_real AS (
  SELECT COALESCE(CEIL(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lt_days))::int, 0) AS lt_real_global
  FROM real_po
),
global_plan AS (
  SELECT COALESCE(CEIL(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lt_days))::int, 0) AS lt_plan_global
  FROM plan_po
)
SELECT
  s.id AS supplier_id,
  COALESCE(
    rm.lt_real_med,
    pm.lt_plan_med,
    gr.lt_real_global,
    gp.lt_plan_global,
    s.lead_time_days,
    0
  ) AS lead_time_days_est
FROM suppliers s
LEFT JOIN real_med rm ON rm.supplier_id = s.id
LEFT JOIN plan_med pm ON pm.supplier_id = s.id
CROSS JOIN global_real gr
CROSS JOIN global_plan gp;

-- Forecast without seasonality_coeff:
-- Weighted MA using config (default: 70% last 7 days, 30% last 30 days)
CREATE OR REPLACE VIEW v_sales_forecast AS
WITH cfg AS (
  SELECT * FROM logistics_config WHERE id = TRUE
),
params AS (
  SELECT
    CURRENT_DATE::date AS as_of,
    cfg.window_days_short AS w_short,
    cfg.window_days_long  AS w_long,
    cfg.forecast_weight_short AS w_short_weight,
    cfg.forecast_weight_long  AS w_long_weight
  FROM cfg
),
sums AS (
  SELECT
    p.id AS product_id,
    COALESCE(SUM(CASE WHEN sh.sale_date > (params.as_of - params.w_short) AND sh.sale_date <= params.as_of THEN sh.qty_sold END), 0) AS qty_short,
    COALESCE(SUM(CASE WHEN sh.sale_date > (params.as_of - params.w_long)  AND sh.sale_date <= params.as_of THEN sh.qty_sold END), 0) AS qty_long
  FROM products p
  CROSS JOIN params
  LEFT JOIN sales_history sh ON sh.product_id = p.id
  GROUP BY p.id
)
SELECT
  product_id,
  (qty_long::numeric / (SELECT w_long FROM params)) AS avg_daily_sales,
  (
    (SELECT w_short_weight FROM params) * (qty_short::numeric / (SELECT w_short FROM params))
    + (SELECT w_long_weight  FROM params) * (qty_long::numeric  / (SELECT w_long  FROM params))
  ) AS forecast_daily_sales
FROM sums;

-- Suggested safety stock (dynamic):
-- suggested = ceil(z * sigma_daily * sqrt(lead_time_days_est))
CREATE OR REPLACE VIEW v_safety_stock_suggested AS
WITH cfg AS (
  SELECT * FROM logistics_config WHERE id = TRUE
),
params AS (
  SELECT
    CURRENT_DATE::date AS as_of,
    cfg.safety_stock_stats_days AS n_days,
    cfg.service_level_z AS z
  FROM cfg
),
days AS (
  SELECT
    p.id AS product_id,
    gs::date AS sale_date
  FROM products p
  CROSS JOIN params
  CROSS JOIN generate_series((params.as_of - params.n_days + 1), params.as_of, interval '1 day') AS gs
),
daily AS (
  SELECT
    d.product_id,
    d.sale_date,
    COALESCE(SUM(sh.qty_sold), 0)::numeric AS qty
  FROM days d
  LEFT JOIN sales_history sh
    ON sh.product_id = d.product_id AND sh.sale_date = d.sale_date
  GROUP BY d.product_id, d.sale_date
),
stats AS (
  SELECT
    product_id,
    COALESCE(stddev_samp(qty), 0)::numeric AS sigma_daily
  FROM daily
  GROUP BY product_id
),
lt AS (
  SELECT
    p.id AS product_id,
    COALESCE(lte.lead_time_days_est, 0) AS lead_time_days_est
  FROM products p
  LEFT JOIN v_supplier_lead_time_est lte ON lte.supplier_id = p.supplier_id
)
SELECT
  s.product_id,
  CEIL((SELECT z FROM params) * s.sigma_daily * sqrt(GREATEST(lt.lead_time_days_est, 0)::numeric))::int
    AS suggested_safety_stock_units
FROM stats s
JOIN lt ON lt.product_id = s.product_id;

-- Core daily logistics view (same columns as old version)
CREATE OR REPLACE VIEW v_logistics_daily AS
WITH base AS (
  SELECT
    p.id AS product_id,
    p.sku,
    p.name,

    COALESCE(lte.lead_time_days_est, 0) AS lead_time_days,

    -- user override: if safety_stock_units > 0 -> use it, else use suggested
    CASE
      WHEN COALESCE(f.safety_stock_units, 0) > 0 THEN f.safety_stock_units
      ELSE COALESCE(ss.suggested_safety_stock_units, 0)
    END AS safety_stock_units,

    COALESCE(f.min_order_qty, 0) AS min_order_qty,
    COALESCE(f.pack_size, 1) AS pack_size,

    COALESCE(i.on_hand, 0) AS on_hand,
    COALESCE(i.reserved, 0) AS reserved,

    COALESCE(poit.in_transit_units, 0) AS in_transit,
    (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) AS available,

    ao.override_rop_units
  FROM products p
  LEFT JOIN product_features f ON f.product_id = p.id
  LEFT JOIN inventory_levels i ON i.product_id = p.id

  LEFT JOIN v_po_in_transit poit ON poit.product_id = p.id
  LEFT JOIN v_supplier_lead_time_est lte ON lte.supplier_id = p.supplier_id
  LEFT JOIN v_safety_stock_suggested ss ON ss.product_id = p.id
  LEFT JOIN v_active_overrides ao ON ao.product_id = p.id
),
fc AS (
  SELECT * FROM v_sales_forecast
),
calc AS (
  SELECT
    b.*,
    COALESCE(fc.avg_daily_sales, 0) AS avg_daily_sales,
    COALESCE(fc.forecast_daily_sales, 0) AS forecast_daily_sales,
    CEIL(COALESCE(fc.forecast_daily_sales, 0) * b.lead_time_days + b.safety_stock_units) AS rop_base
  FROM base b
  LEFT JOIN fc ON fc.product_id = b.product_id
)
SELECT
  c.product_id,
  c.sku,
  c.name,
  c.lead_time_days,
  c.avg_daily_sales,
  c.forecast_daily_sales,

  COALESCE(c.override_rop_units, c.rop_base) AS rop_units,

  c.safety_stock_units,
  c.on_hand,
  c.reserved,
  c.in_transit,
  c.available,

  CASE
    WHEN c.available <= COALESCE(c.override_rop_units, c.rop_base)
      THEN 'CRITICAL'::stock_status
    ELSE 'SAFE'::stock_status
  END AS status,

  c.min_order_qty,
  c.pack_size
FROM calc c;

-- Dead stock (configurable window/thresholds; keeps old column names)
CREATE OR REPLACE VIEW v_dead_stock AS
WITH cfg AS (
  SELECT * FROM logistics_config WHERE id = TRUE
),
periods AS (
  SELECT
    p.id AS product_id,
    CURRENT_DATE::date AS as_of,
    (CURRENT_DATE - cfg.dead_stock_window_days)::date AS d1,
    (CURRENT_DATE - (2 * cfg.dead_stock_window_days))::date AS d2,
    cfg.dead_stock_drop_min AS drop_min,
    cfg.dead_stock_drop_max AS drop_max
  FROM products p
  CROSS JOIN cfg
),
sums AS (
  SELECT
    pr.product_id,
    COALESCE(SUM(CASE WHEN sh.sale_date > pr.d1 AND sh.sale_date <= pr.as_of THEN sh.qty_sold END), 0) AS qty_last,
    COALESCE(SUM(CASE WHEN sh.sale_date > pr.d2 AND sh.sale_date <= pr.d1 THEN sh.qty_sold END), 0) AS qty_prev,
    MAX(pr.drop_min) AS drop_min,
    MAX(pr.drop_max) AS drop_max
  FROM periods pr
  LEFT JOIN sales_history sh ON sh.product_id = pr.product_id
  GROUP BY pr.product_id
)
SELECT
  p.id AS product_id,
  p.sku,
  p.name,
  s.qty_prev AS qty_prev_30,
  s.qty_last AS qty_last_30,
  CASE
    WHEN s.qty_prev = 0 THEN NULL
    ELSE (1 - (s.qty_last::numeric / s.qty_prev::numeric))
  END AS drop_ratio,
  CASE
    WHEN s.qty_prev > 0
     AND (1 - (s.qty_last::numeric / s.qty_prev::numeric)) BETWEEN s.drop_min AND s.drop_max
    THEN TRUE
    ELSE FALSE
  END AS is_dead_stock
FROM sums s
JOIN products p ON p.id = s.product_id;

-- Extended daily view with dead stock flag and DEAD_STOCK status override
CREATE OR REPLACE VIEW v_logistics_daily_ext AS
SELECT
  d.*,
  COALESCE(ds.is_dead_stock, FALSE) AS is_dead_stock,
  CASE
    WHEN COALESCE(ds.is_dead_stock, FALSE) THEN 'DEAD_STOCK'::stock_status
    ELSE d.status
  END AS final_status
FROM v_logistics_daily d
LEFT JOIN v_dead_stock ds ON ds.product_id = d.product_id;

-- Risk view (configurable horizon; keeps column name at_risk_60d)
CREATE OR REPLACE VIEW v_stockout_risk_60d AS
WITH cfg AS (
  SELECT * FROM logistics_config WHERE id = TRUE
)
SELECT
  x.*,
  CASE
    WHEN x.forecast_daily_sales <= 0 THEN NULL
    ELSE (x.available - x.rop_units) / x.forecast_daily_sales
  END AS days_until_rop,
  CASE
    WHEN x.forecast_daily_sales <= 0 THEN FALSE
    WHEN (x.available - x.rop_units) / x.forecast_daily_sales <= cfg.risk_horizon_days THEN TRUE
    ELSE FALSE
  END AS at_risk_60d
FROM v_logistics_daily_ext x
CROSS JOIN cfg;

-- Reorder recommendations (configurable coverage; keeps column name target_units_30d)
CREATE OR REPLACE VIEW v_reorder_recommendations AS
WITH cfg AS (
  SELECT * FROM logistics_config WHERE id = TRUE
),
base AS (
  SELECT
    d.*,
    CEIL(d.forecast_daily_sales * cfg.reorder_coverage_days + d.safety_stock_units) AS target_units_cov,
    (d.available + d.in_transit) AS effective_stock
  FROM v_logistics_daily_ext d
  CROSS JOIN cfg
),
need AS (
  SELECT
    b.*,
    GREATEST(b.target_units_cov - b.effective_stock, 0) AS raw_needed
  FROM base b
),
rounded AS (
  SELECT
    n.*,
    CASE
      WHEN n.raw_needed = 0 THEN 0
      ELSE CEIL(n.raw_needed::numeric / NULLIF(n.pack_size, 0))::int * n.pack_size
    END AS pack_rounded_needed
  FROM need n
),
with_risk AS (
  SELECT
    rr.*,
    sr.at_risk_60d,
    sr.days_until_rop
  FROM rounded rr
  JOIN v_stockout_risk_60d sr ON sr.product_id = rr.product_id
),
with_overrides AS (
  SELECT
    wr.*,
    ao.override_order_qty
  FROM with_risk wr
  LEFT JOIN v_active_overrides ao ON ao.product_id = wr.product_id
)
SELECT
  w.product_id,
  w.sku,
  w.name,
  w.final_status AS status,
  w.at_risk_60d,
  w.days_until_rop,
  w.rop_units,
  w.available,
  w.in_transit,
  w.target_units_cov AS target_units_30d,
  COALESCE(
    w.override_order_qty,
    GREATEST(w.pack_rounded_needed, w.min_order_qty)
  ) AS recommended_order_qty
FROM with_overrides w;

-- ============================================================================
-- ADDITIONS (Sales report "cut" by budget + feature filters)
-- Views/Functions are additive-only and do not replace existing business logic.
-- ============================================================================

-- ---------------------------------------------------------
-- Sales recommendation score (simple & extensible baseline)
-- ---------------------------------------------------------
-- Uses existing forecast view + current availability.
-- Keeps logic isolated so app can evolve scoring independently (SOLID-friendly).
CREATE OR REPLACE VIEW v_sales_recommendation_score AS
SELECT
  p.id AS product_id,
  COALESCE(sf.forecast_daily_sales, 0) AS forecast_daily_sales,
  GREATEST(COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0), 0) AS available,
  CASE
    WHEN GREATEST(COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0), 0) = 0 THEN 0
    ELSE COALESCE(sf.forecast_daily_sales, 0)
  END AS recommendation_score
FROM products p
LEFT JOIN inventory_levels i ON i.product_id = p.id
LEFT JOIN v_sales_forecast sf ON sf.product_id = p.id
WHERE p.is_active = TRUE;

-- ---------------------------------------------------------
-- Parameterized report function (budget + JSONB filters)
-- ---------------------------------------------------------
-- Example:
--   SELECT * FROM fn_sales_report(
--     2500,
--     '{"is_gold":"true","gender":"women","material":"gold"}',
--     TRUE
--   );
--
-- Supported filter keys (all optional):
--   category, brand, gender, material, is_gold
CREATE OR REPLACE FUNCTION fn_sales_report(
  p_budget         NUMERIC,
  p_filters        JSONB DEFAULT '{}'::jsonb,
  p_in_stock_only  BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  product_id BIGINT,
  sku        TEXT,
  name       TEXT,
  category   TEXT,
  list_price NUMERIC,
  currency   CHAR(3),
  image_url  TEXT,
  available  INT,
  score      NUMERIC
)
LANGUAGE sql
AS $$
  SELECT
    p.id,
    p.sku,
    p.name,
    p.category,
    p.list_price,
    p.currency,
    p.image_url,
    s.available,
    s.recommendation_score
  FROM products p
  JOIN v_sales_recommendation_score s ON s.product_id = p.id
  WHERE p.is_active = TRUE
    AND (
      NOT p_in_stock_only
      OR s.available > 0
    )
    AND (
      p_budget IS NULL
      OR (p.list_price IS NOT NULL AND p.list_price <= p_budget)
    )

    -- category: try table column first, fallback to attributes for flexibility
    AND (
      NOT (p_filters ? 'category')
      OR p.category = (p_filters ->> 'category')
      OR p.attributes ->> 'category' = (p_filters ->> 'category')
    )

    AND (
      NOT (p_filters ? 'brand')
      OR p.attributes ->> 'brand' = (p_filters ->> 'brand')
    )

    AND (
      NOT (p_filters ? 'gender')
      OR p.attributes ->> 'gender' = (p_filters ->> 'gender')
    )

    AND (
      NOT (p_filters ? 'material')
      OR p.attributes ->> 'material' = (p_filters ->> 'material')
    )

    AND (
      NOT (p_filters ? 'is_gold')
      OR p.attributes ->> 'is_gold' = (p_filters ->> 'is_gold')
    )

  ORDER BY s.recommendation_score DESC, s.available DESC, p.list_price ASC NULLS LAST;
$$;

COMMIT;
