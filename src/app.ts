import express from "express";
import cors from "cors";

import { logisticsRouter } from "./routes/logistics.routes";
import { overridesRouter } from "./routes/overrides.routes";
import { purchaseOrdersRouter } from "./routes/purchaseOrders.routes";
import { inventoryRouter } from "./routes/inventory.routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

// CORS must come before routes
app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/logistics", logisticsRouter);
app.use("/api/overrides", overridesRouter);
app.use("/api/purchase-orders", purchaseOrdersRouter);
app.use("/api/inventory", inventoryRouter);

app.use(errorHandler);
