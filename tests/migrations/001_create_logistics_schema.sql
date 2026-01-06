CREATE SCHEMA IF NOT EXISTS logistics;

CREATE TABLE IF NOT EXISTS logistics.purchase_orders (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    qty_ordered INTEGER NOT NULL,
    expected_arrival DATE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
