import { Router } from "express";
import {
    createSalesReportPreset,
    deleteSalesReportPreset,
    exportSalesReport,
    getSalesReport,
    getSalesReportFilters,
    listSalesReportPresets,
} from "../controllers/salesReport.controller";

export const salesReportRouter = Router();

salesReportRouter.get("/report", getSalesReport);
salesReportRouter.get("/report/export", exportSalesReport);
salesReportRouter.get("/report/filters", getSalesReportFilters);

salesReportRouter.get("/report-presets", listSalesReportPresets);
salesReportRouter.post("/report-presets", createSalesReportPreset);
salesReportRouter.delete("/report-presets/:id", deleteSalesReportPreset);
