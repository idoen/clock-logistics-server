import { pool } from "../db/pool";

export type PurchaseOrderRecord = {
    id: number;
    product_id: number;
    qty_ordered: number;
    expected_arrival: string | null; // always YYYY-MM-DD (or null)
    status: string; // enum -> text
    order_date: string; // YYYY-MM-DD
    created_at: string; // timestamptz -> text
};

type CreatePurchaseOrderInput = {
    productId: number;
    qtyOrdered: number;
    expectedArrival?: string | null;
};

const PO_COLUMNS_SQL = `
    id,
    product_id,
    qty_ordered,
    expected_arrival::text AS expected_arrival,
    status::text AS status,
    created_at::date::text AS order_date,
    created_at::text AS created_at
`;

export async function listPurchaseOrders(): Promise<PurchaseOrderRecord[]> {
    const result = await pool.query(
        `SELECT ${PO_COLUMNS_SQL}
         FROM logistics.purchase_orders po
         ORDER BY po.created_at DESC
         LIMIT 200`
    );
    return result.rows;
}

export async function createPurchaseOrder(
    input: CreatePurchaseOrderInput
): Promise<PurchaseOrderRecord> {
    const result = await pool.query(
        `INSERT INTO logistics.purchase_orders (product_id, qty_ordered, expected_arrival, status)
         VALUES ($1, $2, $3, 'ORDERED')
         RETURNING ${PO_COLUMNS_SQL}`,
        [input.productId, input.qtyOrdered, input.expectedArrival ?? null]
    );
    return result.rows[0];
}

export async function getPurchaseOrderById(id: number): Promise<PurchaseOrderRecord | null> {
    const result = await pool.query(
        `SELECT ${PO_COLUMNS_SQL}
         FROM logistics.purchase_orders po
         WHERE po.id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
}
