CREATE SCHEMA IF NOT EXISTS logistics;

CREATE TABLE IF NOT EXISTS logistics.products (
    id BIGSERIAL PRIMARY KEY,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logistics.purchase_orders (
    id SERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES logistics.products(id),
    qty_ordered INTEGER NOT NULL,
    expected_arrival DATE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
