import request from "supertest";
import { app } from "../../src/app";
import { pool } from "../../src/db/pool";

jest.mock("../../src/db/pool", () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe("sales report API", () => {
    it("rejects invalid filters JSON", async () => {
        const response = await request(app)
            .get("/api/sales/report")
            .query({ filters: "{bad" })
            .expect(400);

        expect(response.body).toEqual(
            expect.objectContaining({ error: "filters must be valid JSON" })
        );
    });

    it("returns sales report rows and total", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ total: 2 }] })
            .mockResolvedValueOnce({ rows: [{ product_id: 1 }] });

        const response = await request(app)
            .get("/api/sales/report")
            .query({ page: 1, pageSize: 20 })
            .expect(200);

        expect(response.body.rows).toEqual([{ product_id: 1 }]);
        expect(response.body.total).toBe(2);
        expect(response.body.appliedFilters.page).toBe(1);
    });

    it("rejects non-csv export", async () => {
        const response = await request(app)
            .get("/api/sales/report/export")
            .query({ format: "pdf" })
            .expect(400);

        expect(response.body).toEqual(
            expect.objectContaining({ error: "Only csv export is supported" })
        );
    });

    it("exports csv report", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [
                {
                    product_id: 1,
                    sku: "sku",
                    name: "name",
                    category: "cat",
                    list_price: 10,
                    currency: "USD",
                    image_url: null,
                    available: 5,
                    score: 0.8,
                },
            ],
        });

        const response = await request(app)
            .get("/api/sales/report/export")
            .query({ format: "csv" })
            .expect(200);

        expect(response.text).toContain("product_id,sku,name");
        expect(response.headers["content-type"]).toContain("text/csv");
    });

    it("returns sales report filters", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ categories: ["a"], brands: ["b"], genders: [], materials: [], is_gold: [] }],
        });

        const response = await request(app).get("/api/sales/report/filters").expect(200);

        expect(response.body.categories).toEqual(["a"]);
    });

    it("lists report presets", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const response = await request(app).get("/api/sales/report-presets").expect(200);

        expect(response.body).toEqual([expect.objectContaining({ id: 1 })]);
    });

    it("requires name for preset creation", async () => {
        const response = await request(app)
            .post("/api/sales/report-presets")
            .send({})
            .expect(400);

        expect(response.body).toEqual(expect.objectContaining({ error: "name is required" }));
    });

    it("creates a report preset", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: "A" }] });

        const response = await request(app)
            .post("/api/sales/report-presets")
            .send({ name: "A" })
            .expect(201);

        expect(response.body).toEqual(expect.objectContaining({ id: 1, name: "A" }));
    });

    it("rejects invalid preset id on delete", async () => {
        const response = await request(app)
            .delete("/api/sales/report-presets/not-a-number")
            .expect(400);

        expect(response.body).toEqual(expect.objectContaining({ error: "Invalid id" }));
    });

    it("returns 404 when preset missing", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const response = await request(app).delete("/api/sales/report-presets/10").expect(404);

        expect(response.body).toEqual(expect.objectContaining({ error: "Preset not found" }));
    });

    it("deletes report preset", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] });

        const response = await request(app).delete("/api/sales/report-presets/2").expect(200);

        expect(response.body).toEqual(expect.objectContaining({ id: 2 }));
    });
});
