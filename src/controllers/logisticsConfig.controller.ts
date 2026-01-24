import { Request, Response, NextFunction } from "express";
import {
    applyLogisticsConfigUpdate,
    fetchLogisticsConfig,
} from "../services/logisticsConfig.service";
import { LogisticsConfigUpdateInput } from "../types/logisticsConfig";

export async function getLogisticsConfig(_req: Request, res: Response, next: NextFunction) {
    try {
        const config = await fetchLogisticsConfig();
        if (!config) {
            return res.status(404).json({ error: "Config not found" });
        }
        res.json(config);
    } catch (e) {
        next(e);
    }
}

export async function updateLogisticsConfig(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body as LogisticsConfigUpdateInput;
        const result = await applyLogisticsConfigUpdate(body);

        if ("error" in result) {
            return res.status(400).json({ error: result.error });
        }
        if ("notFound" in result) {
            return res.status(404).json({ error: "Config not found" });
        }

        res.json(result.config);
    } catch (e) {
        next(e);
    }
}
