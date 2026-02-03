import request from "supertest";
import { app } from "../../src/app";
import { pool } from "../../src/db/pool";

jest.mock("../../src/db/pool", () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe("inventory API", () => {
    it("rejects invalid product id", async () => {
        const response = await request(app)
            .patch("/api/inventory/not-a-number")
            .send({ onHand: 5 })
            .expect(400);

        expect(response.body).toEqual({ error: "Invalid productId" });
    });

    it("updates inventory levels", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ product_id: 1 }] });

        const response = await request(app)
            .patch("/api/inventory/1")
            .send({ onHand: 5 })
            .expect(200);

        expect(pool.query).toHaveBeenCalled();
        expect(response.body).toEqual({ product_id: 1 });
    });
});
