import request from "supertest";
import { app } from "../../src/app";

describe("purchase orders API", () => {
    it("creates a purchase order and lists it", async () => {
        const createResponse = await request(app)
            .post("/api/purchase-orders")
            .send({
                productId: 202,
                qtyOrdered: 7,
                expectedArrival: "2031-02-01",
            })
            .expect(201);

        expect(createResponse.body).toEqual(
            expect.objectContaining({
                id: expect.any(Number),
                product_id: 202,
                qty_ordered: 7,
                expected_arrival: "2031-02-01",
                status: "ORDERED",
            })
        );

        const listResponse = await request(app).get("/api/purchase-orders").expect(200);

        expect(listResponse.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: createResponse.body.id,
                    product_id: 202,
                }),
            ])
        );
    });
});
