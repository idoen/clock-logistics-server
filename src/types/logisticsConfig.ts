export type LogisticsConfigRecord = {
    id: boolean;
    window_days_short: number;
    window_days_long: number;
    forecast_weight_short: number;
    forecast_weight_long: number;
    safety_stock_stats_days: number;
    service_level_z: number;
    reorder_coverage_days: number;
    risk_horizon_days: number;
    dead_stock_window_days: number;
    dead_stock_drop_min: number;
    dead_stock_drop_max: number;
    updated_at: string;
};

export type LogisticsConfigUpdateInput = {
    windowDaysShort?: number;
    windowDaysLong?: number;
    forecastWeightShort?: number;
    forecastWeightLong?: number;
    safetyStockStatsDays?: number;
    serviceLevelZ?: number;
    reorderCoverageDays?: number;
    riskHorizonDays?: number;
    deadStockWindowDays?: number;
    deadStockDropMin?: number;
    deadStockDropMax?: number;
};
