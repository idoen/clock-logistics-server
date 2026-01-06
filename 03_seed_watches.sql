INSERT INTO logistics.products (sku, name, category)
VALUES ('SEED-001', 'Seed Watch', 'SEED')
ON CONFLICT DO NOTHING;
