import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";
import { CsvColumn, toCsv } from "../utils/csv";

const MAX_PAGE_SIZE = 200;

type SalesReportFilters = {
    category?: string;
    brand?: string;
    gender?: string;
    material?: string;
    is_gold?: string;
};

type SalesReportRow = {
    product_id: number;
    sku: string;
    name: string;
    category: string | null;
    list_price: string | number | null;
    currency: string | null;
    image_url: string | null;
    available: number;
    score: string | number;
};

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        return ["true", "1", "yes"].includes(value.toLowerCase());
    }
    return defaultValue;
}

type ParsedFiltersResult = {
    filters: SalesReportFilters;
    error?: string;
};

function parseFilters(raw: unknown): ParsedFiltersResult {
    if (!raw) return { filters: {} };
    if (typeof raw === "object") return { filters: raw as SalesReportFilters };
    if (typeof raw !== "string") return { filters: {} };

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return { filters: parsed as SalesReportFilters };
        }
        return { filters: {} };
    } catch {
        return { filters: {}, error: "filters must be valid JSON" };
    }
}

type SortConfig = {
    field: "score" | "available" | "price" | "name";
    direction: "asc" | "desc";
};

function parseSort(value: unknown): SortConfig {
    if (!value || typeof value !== "string") {
        return { field: "score", direction: "desc" };
    }

    const [rawField, rawDirection] = value.split(":");
    const field = rawField?.toLowerCase();
    const direction = rawDirection?.toLowerCase();

    const normalizedField: SortConfig["field"] =
        field === "available" || field === "price" || field === "name" ? field : "score";

    const normalizedDirection: SortConfig["direction"] =
        direction === "asc" || direction === "desc"
            ? direction
            : normalizedField === "price" || normalizedField === "name"
              ? "asc"
              : "desc";

    return { field: normalizedField, direction: normalizedDirection };
}

type ReportSource = {
    fromSql: string;
    params: Array<string | number | boolean | Record<string, unknown> | null>;
};

function buildReportSource(
    budget: number | null,
    filters: SalesReportFilters,
    inStockOnly: boolean
): ReportSource {
    if (inStockOnly) {
        return {
            fromSql: "FROM logistics.fn_sales_report($1::numeric, $2::jsonb) AS r",
            params: [budget, filters],
        };
    }

    const conditions: string[] = ["p.is_active = TRUE"];
    const params: Array<string | number | Record<string, unknown> | null> = [];

    if (budget !== null && Number.isFinite(budget)) {
        params.push(budget);
        conditions.push(`p.list_price IS NOT NULL AND p.list_price <= $${params.length}`);
    }

    if (filters.category) {
        params.push(filters.category);
        const paramRef = `$${params.length}`;
        conditions.push(`(p.category = ${paramRef} OR p.attributes ->> 'category' = ${paramRef})`);
    }

    if (filters.brand) {
        params.push(filters.brand);
        conditions.push(`p.attributes ->> 'brand' = $${params.length}`);
    }

    if (filters.gender) {
        params.push(filters.gender);
        conditions.push(`p.attributes ->> 'gender' = $${params.length}`);
    }

    if (filters.material) {
        params.push(filters.material);
        conditions.push(`p.attributes ->> 'material' = $${params.length}`);
    }

    if (filters.is_gold) {
        params.push(filters.is_gold);
        conditions.push(`p.attributes ->> 'is_gold' = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    return {
        fromSql: `FROM (
            SELECT
                p.id AS product_id,
                p.sku,
                p.name,
                p.category,
                p.list_price,
                p.currency,
                p.image_url,
                s.available,
                s.recommendation_score AS score
            FROM logistics.products p
            JOIN logistics.v_sales_recommendation_score s ON s.product_id = p.id
            ${where}
        ) AS r`,
        params,
    };
}

function getSortClause(sort: SortConfig): string {
    switch (sort.field) {
        case "available":
            return `ORDER BY r.available ${sort.direction}, r.score DESC, r.name ASC`;
        case "price":
            return `ORDER BY r.list_price ${sort.direction} NULLS LAST, r.score DESC, r.name ASC`;
        case "name":
            return `ORDER BY r.name ${sort.direction}, r.score DESC`;
        case "score":
        default:
            return `ORDER BY r.score ${sort.direction}, r.available DESC, r.list_price ASC NULLS LAST`;
    }
}

export async function getSalesReport(req: Request, res: Response, next: NextFunction) {
    try {
        const budgetValue = req.query.budget ? Number(req.query.budget) : null;
        const budget = budgetValue !== null && Number.isFinite(budgetValue) ? budgetValue : null;
        const { filters, error } = parseFilters(req.query.filters);
        if (error) {
            return res.status(400).json({ error });
        }
        const inStockOnly = parseBoolean(req.query.inStockOnly, true);
        const sort = parseSort(req.query.sort);

        const page = Math.max(Number(req.query.page) || 1, 1);
        const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), MAX_PAGE_SIZE);
        const offset = (page - 1) * pageSize;

        const reportSource = buildReportSource(budget, filters, inStockOnly);
        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS total
             ${reportSource.fromSql}`,
            reportSource.params
        );

        const orderBy = getSortClause(sort);
        const rowsResult = await pool.query(
            `SELECT
                r.product_id,
                r.sku,
                r.name,
                r.category,
                r.list_price,
                r.currency,
                r.image_url,
                r.available,
                r.score
             ${reportSource.fromSql}
             ${orderBy}
             LIMIT $${reportSource.params.length + 1} OFFSET $${reportSource.params.length + 2}`,
            [...reportSource.params, pageSize, offset]
        );

        res.json({
            rows: rowsResult.rows,
            total: countResult.rows[0]?.total ?? 0,
            appliedFilters: {
                budget,
                filters,
                inStockOnly,
                sort,
                page,
                pageSize,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function exportSalesReport(req: Request, res: Response, next: NextFunction) {
    try {
        const format = req.query.format?.toString().toLowerCase();
        if (format && format !== "csv") {
            return res.status(400).json({ error: "Only csv export is supported" });
        }

        const budgetValue = req.query.budget ? Number(req.query.budget) : null;
        const budget = budgetValue !== null && Number.isFinite(budgetValue) ? budgetValue : null;
        const { filters, error } = parseFilters(req.query.filters);
        if (error) {
            return res.status(400).json({ error });
        }
        const inStockOnly = parseBoolean(req.query.inStockOnly, true);
        const sort = parseSort(req.query.sort);

        const orderBy = getSortClause(sort);

        const reportSource = buildReportSource(budget, filters, inStockOnly);
        const rowsResult = await pool.query(
            `SELECT
                r.product_id,
                r.sku,
                r.name,
                r.category,
                r.list_price,
                r.currency,
                r.image_url,
                r.available,
                r.score
             ${reportSource.fromSql}
             ${orderBy}`,
            reportSource.params
        );

        const columns: CsvColumn<SalesReportRow>[] = [
            { key: "product_id", header: "product_id" },
            { key: "sku", header: "sku" },
            { key: "name", header: "name" },
            { key: "category", header: "category" },
            { key: "list_price", header: "list_price" },
            { key: "currency", header: "currency" },
            { key: "image_url", header: "image_url" },
            { key: "available", header: "available" },
            { key: "score", header: "score" },
        ];

        const csv = toCsv(rowsResult.rows, columns);

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=sales-report.csv");
        res.send(csv);
    } catch (error) {
        next(error);
    }
}

export async function getSalesReportFilters(_req: Request, res: Response, next: NextFunction) {
    try {
        const result = await pool.query(
            `SELECT
                ARRAY(
                    SELECT DISTINCT value FROM (
                        SELECT category AS value
                        FROM logistics.products
                        WHERE category IS NOT NULL AND category <> ''
                        UNION
                        SELECT attributes ->> 'category' AS value
                        FROM logistics.products
                        WHERE attributes ? 'category' AND attributes ->> 'category' <> ''
                    ) categories
                    ORDER BY value
                ) AS categories,
                ARRAY(
                    SELECT DISTINCT attributes ->> 'brand'
                    FROM logistics.products
                    WHERE attributes ? 'brand' AND attributes ->> 'brand' <> ''
                    ORDER BY attributes ->> 'brand'
                ) AS brands,
                ARRAY(
                    SELECT DISTINCT attributes ->> 'gender'
                    FROM logistics.products
                    WHERE attributes ? 'gender' AND attributes ->> 'gender' <> ''
                    ORDER BY attributes ->> 'gender'
                ) AS genders,
                ARRAY(
                    SELECT DISTINCT attributes ->> 'material'
                    FROM logistics.products
                    WHERE attributes ? 'material' AND attributes ->> 'material' <> ''
                    ORDER BY attributes ->> 'material'
                ) AS materials,
                ARRAY(
                    SELECT DISTINCT attributes ->> 'is_gold'
                    FROM logistics.products
                    WHERE attributes ? 'is_gold' AND attributes ->> 'is_gold' <> ''
                    ORDER BY attributes ->> 'is_gold'
                ) AS is_gold
             `
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
}

export async function listSalesReportPresets(_req: Request, res: Response, next: NextFunction) {
    try {
        const result = await pool.query(
            `SELECT id, name, budget, filters, created_at
             FROM logistics.sales_report_presets
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
}

type CreateSalesReportPresetBody = {
    name?: string;
    budget?: number | null;
    filters?: SalesReportFilters;
};

export async function createSalesReportPreset(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body as CreateSalesReportPresetBody;
        if (!body?.name) {
            return res.status(400).json({ error: "name is required" });
        }

        const filters = body.filters ?? {};
        const budget = body.budget ?? null;

        const result = await pool.query(
            `INSERT INTO logistics.sales_report_presets (name, budget, filters)
             VALUES ($1, $2, $3)
             RETURNING id, name, budget, filters, created_at`,
            [body.name, budget, filters]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
}

export async function deleteSalesReportPreset(req: Request, res: Response, next: NextFunction) {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }

        const result = await pool.query(
            `DELETE FROM logistics.sales_report_presets
             WHERE id = $1
             RETURNING id, name, budget, filters, created_at`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Preset not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
}
