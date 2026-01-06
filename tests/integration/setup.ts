import { afterAll, afterEach, beforeAll } from "@jest/globals";
import { closeDb, migrate, truncateAll } from "../helpers/db";

beforeAll(async () => {
    await migrate();
});

afterEach(async () => {
    await truncateAll();
});

afterAll(async () => {
    await closeDb();
});
