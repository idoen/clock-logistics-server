import {
    createPurchaseOrder,
    getPurchaseOrderById,
} from "../../src/repositories/purchaseOrders.repository";
import { getAnyProductId } from "../helpers/db";

describe("purchaseOrders.repository", () => {
    it("creates and fetches a purchase order record", async () => {
        const productId = await getAnyProductId();
        const created = await createPurchaseOrder({
            productId,
            qtyOrdered: 12,
            expectedArrival: "2030-01-15",
        });

        const fetched = await getPurchaseOrderById(created.id);

        expect(fetched).not.toBeNull();
        expect(fetched?.id).toBe(created.id);
        expect(Number(fetched?.product_id)).toBe(productId);
        expect(fetched?.qty_ordered).toBe(created.qty_ordered);
        expect(fetched?.expected_arrival).toBe(created.expected_arrival);
        expect(fetched?.status).toBe("ORDERED");
    });
});
