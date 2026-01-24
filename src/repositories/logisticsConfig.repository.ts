import { pool } from "../db/pool";
import { LogisticsConfigRecord, LogisticsConfigUpdateInput } from "../types/logisticsConfig";

const CONFIG_COLUMNS_SQL = `
    id,
    window_days_short,
    window_days_long,
    forecast_weight_short::float8 AS forecast_weight_short,
    forecast_weight_long::float8 AS forecast_weight_long,
    safety_stock_stats_days,
    service_level_z::float8 AS service_level_z,
    reorder_coverage_days,
    risk_horizon_days,
    dead_stock_window_days,
    dead_stock_drop_min::float8 AS dead_stock_drop_min,
    dead_stock_drop_max::float8 AS dead_stock_drop_max,
    updated_at::text AS updated_at
`;

export async function ensureLogisticsConfigRow(): Promise<void> {
    await pool.query(
        `INSERT INTO logistics.logistics_config (id)
         VALUES (TRUE)
         ON CONFLICT (id) DO NOTHING`
    );
}

export async function getLogisticsConfig(): Promise<LogisticsConfigRecord | null> {
    const result = await pool.query(
        `SELECT ${CONFIG_COLUMNS_SQL}
         FROM logistics.logistics_config
         WHERE id = TRUE`
    );
    return result.rows[0] ?? null;
}

export async function updateLogisticsConfig(
    input: LogisticsConfigUpdateInput
): Promise<LogisticsConfigRecord | null> {
    const values = [
        input.windowDaysShort ?? null,
        input.windowDaysLong ?? null,
        input.forecastWeightShort ?? null,
        input.forecastWeightLong ?? null,
        input.safetyStockStatsDays ?? null,
        input.serviceLevelZ ?? null,
        input.reorderCoverageDays ?? null,
        input.riskHorizonDays ?? null,
        input.deadStockWindowDays ?? null,
        input.deadStockDropMin ?? null,
        input.deadStockDropMax ?? null,
    ];

    const result = await pool.query(
        `UPDATE logistics.logistics_config
         SET
            window_days_short = COALESCE($1, window_days_short),
            window_days_long = COALESCE($2, window_days_long),
            forecast_weight_short = COALESCE($3, forecast_weight_short),
            forecast_weight_long = COALESCE($4, forecast_weight_long),
            safety_stock_stats_days = COALESCE($5, safety_stock_stats_days),
            service_level_z = COALESCE($6, service_level_z),
            reorder_coverage_days = COALESCE($7, reorder_coverage_days),
            risk_horizon_days = COALESCE($8, risk_horizon_days),
            dead_stock_window_days = COALESCE($9, dead_stock_window_days),
            dead_stock_drop_min = COALESCE($10, dead_stock_drop_min),
            dead_stock_drop_max = COALESCE($11, dead_stock_drop_max),
            updated_at = now()
         WHERE id = TRUE
         RETURNING ${CONFIG_COLUMNS_SQL}`,
        values
    );

    return result.rows[0] ?? null;
}
