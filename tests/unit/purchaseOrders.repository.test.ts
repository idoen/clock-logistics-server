import {
    createPurchaseOrder,
    getPurchaseOrderById,
    listPurchaseOrders,
} from "../../src/repositories/purchaseOrders.repository";
import { pool } from "../../src/db/pool";

jest.mock("../../src/db/pool", () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe("purchaseOrders.repository", () => {
    it("lists purchase orders", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const result = await listPurchaseOrders();

        expect(pool.query).toHaveBeenCalled();
        expect(result).toEqual([{ id: 1 }]);
    });

    it("creates a purchase order", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 2 }] });

        const result = await createPurchaseOrder({
            productId: 12,
            qtyOrdered: 5,
            expectedArrival: null,
        });

        expect(pool.query).toHaveBeenCalled();
        expect(result).toEqual({ id: 2 });
    });

    it("gets purchase order by id", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 3 }] });

        const result = await getPurchaseOrderById(3);

        expect(pool.query).toHaveBeenCalled();
        expect(result).toEqual({ id: 3 });
    });
});
