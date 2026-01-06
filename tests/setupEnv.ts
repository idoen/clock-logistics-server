if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5433/clock_logistics_test";
}

process.env.NODE_ENV = "test";
