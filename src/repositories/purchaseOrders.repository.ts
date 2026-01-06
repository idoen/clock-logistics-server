import { pool } from "../db/pool";

export type PurchaseOrderRecord = {
    id: number;
    product_id: number;
    qty_ordered: number;
    expected_arrival: string | null;
    status: string;
    created_at: string;
};

type CreatePurchaseOrderInput = {
    productId: number;
    qtyOrdered: number;
    expectedArrival?: string | null;
};

export async function listPurchaseOrders(): Promise<PurchaseOrderRecord[]> {
    const result = await pool.query(
        "SELECT * FROM logistics.purchase_orders ORDER BY created_at DESC LIMIT 200"
    );
    return result.rows;
}

export async function createPurchaseOrder(
    input: CreatePurchaseOrderInput
): Promise<PurchaseOrderRecord> {
    const result = await pool.query(
        `INSERT INTO logistics.purchase_orders (product_id, qty_ordered, expected_arrival, status)
         VALUES ($1, $2, $3, 'ORDERED')
         RETURNING *`,
        [input.productId, input.qtyOrdered, input.expectedArrival ?? null]
    );
    return result.rows[0];
}

export async function getPurchaseOrderById(id: number): Promise<PurchaseOrderRecord | null> {
    const result = await pool.query(
        "SELECT * FROM logistics.purchase_orders WHERE id = $1",
        [id]
    );
    return result.rows[0] ?? null;
}
