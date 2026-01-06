import { createPurchaseOrder, getPurchaseOrderById } from "../../src/repositories/purchaseOrders.repository";

describe("purchaseOrders.repository", () => {
    it("creates and fetches a purchase order record", async () => {
        const created = await createPurchaseOrder({
            productId: 101,
            qtyOrdered: 12,
            expectedArrival: "2030-01-15",
        });

        const fetched = await getPurchaseOrderById(created.id);

        expect(fetched).not.toBeNull();
        expect(fetched?.id).toBe(created.id);
        expect(fetched?.product_id).toBe(created.product_id);
        expect(fetched?.qty_ordered).toBe(created.qty_ordered);
        expect(fetched?.expected_arrival).toBe(created.expected_arrival);
        expect(fetched?.status).toBe("ORDERED");
    });
});
