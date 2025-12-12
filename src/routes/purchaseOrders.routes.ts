import { Router } from "express";
import { createPurchaseOrder, listPurchaseOrders } from "../controllers/purchaseOrders.controller";

export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.get("/", listPurchaseOrders);
purchaseOrdersRouter.post("/", createPurchaseOrder);
