import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";

type CreateOverrideBody = {
    productId: number;
    overrideRopUnits?: number;
    overrideOrderQty?: number;
    reason?: string;
};

export async function createOverride(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body as CreateOverrideBody;

        if (!body?.productId) {
            return res.status(400).json({ error: "productId is required" });
        }

        // optional: disable any previous active overrides for this product
        await pool.query(
            `UPDATE logistics.logistic_overrides SET is_active = FALSE WHERE product_id = $1 AND is_active = TRUE`,
            [body.productId]
        );

        const result = await pool.query(
            `INSERT INTO logistics.logistic_overrides (product_id, override_rop_units, override_order_qty, reason, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
            [body.productId, body.overrideRopUnits ?? null, body.overrideOrderQty ?? null, body.reason ?? null]
        );

        res.status(201).json(result.rows[0]);
    } catch (e) {
        next(e);
    }
}

export async function disableOverride(req: Request, res: Response, next: NextFunction) {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

        const result = await pool.query(
            `UPDATE logistics.logistic_overrides SET is_active = FALSE WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: "Override not found" });
        res.json(result.rows[0]);
    } catch (e) {
        next(e);
    }
}
