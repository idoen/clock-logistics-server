import request from "supertest";
import { app } from "../../src/app";
import { pool } from "../../src/db/pool";

jest.mock("../../src/db/pool", () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe("overrides API", () => {
    it("requires productId when creating override", async () => {
        const response = await request(app)
            .post("/api/overrides")
            .send({})
            .expect(400);

        expect(response.body).toEqual(expect.objectContaining({ error: "productId is required" }));
    });

    it("creates an override", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ id: 1, product_id: 2 }] });

        const response = await request(app)
            .post("/api/overrides")
            .send({ productId: 2 })
            .expect(201);

        expect(response.body).toEqual(expect.objectContaining({ id: 1, product_id: 2 }));
    });

    it("rejects invalid id on disable", async () => {
        const response = await request(app)
            .patch("/api/overrides/not-a-number/disable")
            .expect(400);

        expect(response.body).toEqual(expect.objectContaining({ error: "Invalid id" }));
    });

    it("returns 404 if override not found", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const response = await request(app).patch("/api/overrides/10/disable").expect(404);

        expect(response.body).toEqual(expect.objectContaining({ error: "Override not found" }));
    });

    it("disables override", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 10 }] });

        const response = await request(app).patch("/api/overrides/10/disable").expect(200);

        expect(response.body).toEqual(expect.objectContaining({ id: 10 }));
    });
});
