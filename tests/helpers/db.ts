import { Pool } from "pg";
import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing for tests");

const sqlScripts = [
    "01_schema.sql",
    "02_views.sql",
    "03_seed_watches.sql",
    "04_mock_plus_watches.sql",
].map((filename) => path.join(process.cwd(), filename));

export const testPool = new Pool({ connectionString: databaseUrl });

export async function migrate() {
    for (const scriptPath of sqlScripts) {
        if (!fs.existsSync(scriptPath)) {
            throw new Error(
                `Missing SQL script for tests: ${scriptPath}. ` +
                    "Put 01_schema.sql..04_mock_plus_watches.sql in repo root or update tests/helpers/db.ts paths."
            );
        }
        const sql = fs.readFileSync(scriptPath, "utf8");
        await testPool.query(sql);
    }
}

export async function truncateAll() {
    await testPool.query("TRUNCATE logistics.purchase_orders RESTART IDENTITY CASCADE");
}

export async function closeDb() {
    await testPool.end();
}

export async function getAnyProductId(): Promise<number> {
    const result = await testPool.query<{ id: string }>(
        "SELECT id FROM logistics.products ORDER BY id LIMIT 1"
    );
    if (result.rowCount && result.rows[0]?.id != null) {
        return Number(result.rows[0].id);
    }
    throw new Error("No products found in logistics.products. Did the seed scripts run successfully?");
}
