BEGIN;

SET search_path TO logistics, public;

INSERT INTO products (sku, name, category)
VALUES ('SEED-001', 'Seed Watch', 'SEED')
ON CONFLICT DO NOTHING;

COMMIT;
