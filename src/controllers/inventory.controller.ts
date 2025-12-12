import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";

type UpdateInventoryBody = {
    onHand?: number;
    reserved?: number;
    inTransit?: number;
};

export async function updateInventory(req: Request, res: Response, next: NextFunction) {
    try {
        const productId = Number(req.params.productId);
        if (!Number.isFinite(productId)) return res.status(400).json({ error: "Invalid productId" });

        const body = req.body as UpdateInventoryBody;

        const result = await pool.query(
            `INSERT INTO logistics.inventory_levels (product_id, on_hand, reserved, in_transit, last_counted_at)
       VALUES ($1, COALESCE($2, 0), COALESCE($3, 0), COALESCE($4, 0), now())
       ON CONFLICT (product_id)
       DO UPDATE SET
         on_hand = COALESCE(EXCLUDED.on_hand, logistics.inventory_levels.on_hand),
         reserved = COALESCE(EXCLUDED.reserved, logistics.inventory_levels.reserved),
         in_transit = COALESCE(EXCLUDED.in_transit, logistics.inventory_levels.in_transit),
         last_counted_at = now(),
         updated_at = now()
       RETURNING *`,
            [productId, body.onHand ?? null, body.reserved ?? null, body.inTransit ?? null]
        );

        res.json(result.rows[0]);
    } catch (e) {
        next(e);
    }
}
