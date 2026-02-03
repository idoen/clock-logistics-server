import request from "supertest";
import { app } from "../../src/app";
import { pool } from "../../src/db/pool";

jest.mock("../../src/db/pool", () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe("logistics API", () => {
    it("returns daily logistics rows", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const response = await request(app).get("/api/logistics/daily").expect(200);

        expect(pool.query).toHaveBeenCalled();
        expect(response.body).toEqual([{ id: 1 }]);
    });

    it("returns risk 60d rows", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 2 }] });

        const response = await request(app).get("/api/logistics/risk60d").expect(200);

        expect(response.body).toEqual([{ id: 2 }]);
    });

    it("returns reorder recommendations", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 3 }] });

        const response = await request(app).get("/api/logistics/reorder").expect(200);

        expect(response.body).toEqual([{ id: 3 }]);
    });
});
