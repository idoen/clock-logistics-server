import { Router } from "express";
import { createOverride, disableOverride } from "../controllers/overrides.controller";

export const overridesRouter = Router();

overridesRouter.post("/", createOverride);
overridesRouter.patch("/:id/disable", disableOverride);
