import {
    createPurchaseOrder,
    getPurchaseOrderById,
} from "../../src/repositories/purchaseOrders.repository";
import { pool } from "../../src/db/pool";

jest.mock("../../src/db/pool", () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe("purchaseOrders.repository", () => {
    it("creates and fetches a purchase order record", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 12,
                        product_id: 99,
                        qty_ordered: 12,
                        expected_arrival: "2030-01-15",
                        status: "ORDERED",
                        order_date: "2030-01-01",
                        created_at: "2030-01-01T00:00:00Z",
                    },
                ],
            })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 12,
                        product_id: 99,
                        qty_ordered: 12,
                        expected_arrival: "2030-01-15",
                        status: "ORDERED",
                        order_date: "2030-01-01",
                        created_at: "2030-01-01T00:00:00Z",
                    },
                ],
            });

        const created = await createPurchaseOrder({
            productId: 99,
            qtyOrdered: 12,
            expectedArrival: "2030-01-15",
        });

        const fetched = await getPurchaseOrderById(created.id);

        expect(fetched).not.toBeNull();
        expect(fetched?.id).toBe(created.id);
        expect(Number(fetched?.product_id)).toBe(99);
        expect(fetched?.qty_ordered).toBe(created.qty_ordered);
        expect(fetched?.expected_arrival).toBe(created.expected_arrival);
        expect(fetched?.status).toBe("ORDERED");
    });
});
