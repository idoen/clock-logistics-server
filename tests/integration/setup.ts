import { afterAll, afterEach, beforeAll } from "@jest/globals";
import { closeDb, migrate, truncateAll } from "../helpers/db";

beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    if (!databaseUrl.includes("clock_logistics_test") && !databaseUrl.includes("_test")) {
        throw new Error(
            `Refusing to run integration tests: DATABASE_URL must target a test database. Received: ${databaseUrl}`
        );
    }
    await migrate();
});

afterEach(async () => {
    await truncateAll();
});

afterAll(async () => {
    await closeDb();
});
