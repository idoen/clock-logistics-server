import request from "supertest";
import { app } from "../../src/app";
import { createTestProduct } from "../helpers/db";

describe("purchase orders API", () => {
    it("creates a purchase order and lists it", async () => {
        const productId = await createTestProduct();
        const createResponse = await request(app)
            .post("/api/purchase-orders")
            .send({
                productId,
                qtyOrdered: 7,
                expectedArrival: "2031-02-01",
            })
            .expect(201);

        expect(Number(createResponse.body.product_id)).toBe(productId);

        const listResponse = await request(app).get("/api/purchase-orders").expect(200);

        expect(listResponse.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: createResponse.body.id,
                }),
            ])
        );
    });
});
