import { Router } from "express";
import {
    getLogisticsConfig,
    updateLogisticsConfig,
} from "../controllers/logisticsConfig.controller";

export const logisticsConfigRouter = Router();

logisticsConfigRouter.get("/", getLogisticsConfig);
logisticsConfigRouter.patch("/", updateLogisticsConfig);
