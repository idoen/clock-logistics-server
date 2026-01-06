import { Pool } from "pg";
import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing for tests");

const migrationPath = path.join(__dirname, "..", "migrations", "001_create_logistics_schema.sql");

export const testPool = new Pool({ connectionString: databaseUrl });

export async function migrate() {
    const sql = fs.readFileSync(migrationPath, "utf8");
    await testPool.query(sql);
}

export async function truncateAll() {
    await testPool.query(
        "TRUNCATE logistics.purchase_orders, logistics.products RESTART IDENTITY CASCADE"
    );
}

export async function closeDb() {
    await testPool.end();
}

export async function createTestProduct(): Promise<number> {
    const sku = `TEST-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const result = await testPool.query<{ id: string }>(
        `INSERT INTO logistics.products (sku, name, category)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [sku, "Test Product", "TEST"]
    );

    return Number(result.rows[0].id);
}
