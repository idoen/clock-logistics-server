import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";

type CreatePOBody = {
    productId: number;
    qtyOrdered: number;
    expectedArrival?: string; // YYYY-MM-DD
};

export async function listPurchaseOrders(_req: Request, res: Response, next: NextFunction) {
    try {
        const result = await pool.query(
            `SELECT * FROM logistics.purchase_orders ORDER BY created_at DESC LIMIT 200`
        );
        res.json(result.rows);
    } catch (e) {
        next(e);
    }
}

export async function createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body as CreatePOBody;

        if (!body?.productId || !body?.qtyOrdered) {
            return res.status(400).json({ error: "productId and qtyOrdered are required" });
        }
        if (body.qtyOrdered <= 0) {
            return res.status(400).json({ error: "qtyOrdered must be > 0" });
        }

        const result = await pool.query(
            `INSERT INTO logistics.purchase_orders (product_id, qty_ordered, expected_arrival, status)
       VALUES ($1, $2, $3, 'ORDERED')
       RETURNING *`,
            [body.productId, body.qtyOrdered, body.expectedArrival ?? null]
        );

        res.status(201).json(result.rows[0]);
    } catch (e) {
        next(e);
    }
}
