import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";

export async function getDaily(req: Request, res: Response, next: NextFunction) {
    try {
        const status = req.query.status?.toString(); // SAFE | CRITICAL | DEAD_STOCK
        const sql =
            status
                ? `SELECT * FROM logistics.v_logistics_daily_ext WHERE final_status = $1 ORDER BY rop_units DESC`
                : `SELECT * FROM logistics.v_logistics_daily_ext ORDER BY final_status DESC, rop_units DESC`;

        const result = status ? await pool.query(sql, [status]) : await pool.query(sql);
        res.json(result.rows);
    } catch (e) {
        next(e);
    }
}

export async function getRisk60d(_req: Request, res: Response, next: NextFunction) {
    try {
        const result = await pool.query(
            `SELECT * FROM logistics.v_stockout_risk_60d ORDER BY at_risk_60d DESC, days_until_rop ASC NULLS LAST`
        );
        res.json(result.rows);
    } catch (e) {
        next(e);
    }
}

export async function getReorderRecommendations(_req: Request, res: Response, next: NextFunction) {
    try {
        const result = await pool.query(
            `SELECT * FROM logistics.v_reorder_recommendations ORDER BY status DESC, at_risk_60d DESC, recommended_order_qty DESC`
        );
        res.json(result.rows);
    } catch (e) {
        next(e);
    }
}
