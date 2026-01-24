import {
    LogisticsConfigRecord,
    LogisticsConfigUpdateInput,
} from "../types/logisticsConfig";
import {
    getLogisticsConfig,
    ensureLogisticsConfigRow,
    updateLogisticsConfig,
} from "../repositories/logisticsConfig.repository";
import { validateLogisticsConfigUpdate } from "../utils/logisticsConfigValidation";

type UpdateResult =
    | { config: LogisticsConfigRecord }
    | { error: string }
    | { notFound: true };

const FORECAST_WEIGHT_TOLERANCE = 0.001;

export async function fetchLogisticsConfig(): Promise<LogisticsConfigRecord | null> {
    await ensureLogisticsConfigRow();
    return getLogisticsConfig();
}

export async function applyLogisticsConfigUpdate(
    input: LogisticsConfigUpdateInput
): Promise<UpdateResult> {
    const validationError = validateLogisticsConfigUpdate(input);
    if (validationError) {
        return { error: validationError };
    }

    await ensureLogisticsConfigRow();
    const current = await getLogisticsConfig();
    if (!current) {
        return { notFound: true };
    }

    const nextForecastWeightShort =
        input.forecastWeightShort ?? current.forecast_weight_short;
    const nextForecastWeightLong =
        input.forecastWeightLong ?? current.forecast_weight_long;

    if (
        Math.abs(nextForecastWeightShort + nextForecastWeightLong - 1) >
        FORECAST_WEIGHT_TOLERANCE
    ) {
        return { error: "Forecast weights must sum to 1" };
    }

    const nextDeadStockDropMin =
        input.deadStockDropMin ?? current.dead_stock_drop_min;
    const nextDeadStockDropMax =
        input.deadStockDropMax ?? current.dead_stock_drop_max;

    if (nextDeadStockDropMin > nextDeadStockDropMax) {
        return { error: "deadStockDropMin must be <= deadStockDropMax" };
    }

    const updated = await updateLogisticsConfig(input);
    if (!updated) {
        return { notFound: true };
    }

    return { config: updated };
}
