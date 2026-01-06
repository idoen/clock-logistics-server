import fs from "fs";
import path from "path";
import { pool } from "../../src/db/pool";

const migrationPath = path.join(__dirname, "..", "migrations", "001_create_logistics_schema.sql");

export async function migrate() {
    const sql = fs.readFileSync(migrationPath, "utf8");
    await pool.query(sql);
}

export async function truncateAll() {
    await pool.query("TRUNCATE logistics.purchase_orders RESTART IDENTITY CASCADE");
}

export async function closeDb() {
    await pool.end();
}
