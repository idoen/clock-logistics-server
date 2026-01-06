if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgres://postgres:password@localhost:5432/clock_logistics_test";
}

process.env.NODE_ENV = "test";
