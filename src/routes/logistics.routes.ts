import { Router } from "express";
import { getDaily, getRisk60d, getReorderRecommendations } from "../controllers/logistics.controller";

export const logisticsRouter = Router();

logisticsRouter.get("/daily", getDaily);
logisticsRouter.get("/risk60d", getRisk60d);
logisticsRouter.get("/reorder", getReorderRecommendations);
