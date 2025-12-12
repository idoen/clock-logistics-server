import { Router } from "express";
import { updateInventory } from "../controllers/inventory.controller";

export const inventoryRouter = Router();

inventoryRouter.patch("/:productId", updateInventory);
