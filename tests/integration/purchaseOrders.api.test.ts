import request from "supertest";
import { app } from "../../src/app";
import {
    createPurchaseOrder,
    listPurchaseOrders,
} from "../../src/repositories/purchaseOrders.repository";

jest.mock("../../src/repositories/purchaseOrders.repository", () => ({
    createPurchaseOrder: jest.fn(),
    listPurchaseOrders: jest.fn(),
}));

describe("purchase orders API", () => {
    it("creates a purchase order and lists it", async () => {
        (createPurchaseOrder as jest.Mock).mockResolvedValue({
            id: 10,
            product_id: 42,
            qty_ordered: 7,
            expected_arrival: "2031-02-01",
            status: "ORDERED",
            order_date: "2031-01-01",
            created_at: "2031-01-01T00:00:00Z",
        });
        (listPurchaseOrders as jest.Mock).mockResolvedValue([
            {
                id: 10,
                product_id: 42,
                qty_ordered: 7,
                expected_arrival: "2031-02-01",
                status: "ORDERED",
                order_date: "2031-01-01",
                created_at: "2031-01-01T00:00:00Z",
            },
        ]);

        const createResponse = await request(app)
            .post("/api/purchase-orders")
            .send({
                productId: 42,
                qtyOrdered: 7,
                expectedArrival: "2031-02-01",
            })
            .expect(201);

        expect(Number(createResponse.body.product_id)).toBe(42);

        const listResponse = await request(app).get("/api/purchase-orders").expect(200);

        expect(listResponse.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: createResponse.body.id,
                }),
            ])
        );
    });

    it("validates required fields", async () => {
        const response = await request(app).post("/api/purchase-orders").send({}).expect(400);

        expect(response.body).toEqual({ error: "productId and qtyOrdered are required" });
    });
});
