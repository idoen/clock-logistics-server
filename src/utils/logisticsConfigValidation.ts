import { LogisticsConfigUpdateInput } from "../types/logisticsConfig";

const MIN_WEIGHT = 0;
const MAX_WEIGHT = 1;

function isDefined<T>(value: T | undefined): value is T {
    return value !== undefined;
}

export function validateLogisticsConfigUpdate(input: LogisticsConfigUpdateInput): string | null {
    const hasUpdate = Object.values(input).some(isDefined);
    if (!hasUpdate) {
        return "At least one field is required";
    }

    if (isDefined(input.windowDaysShort) && input.windowDaysShort <= 0) {
        return "windowDaysShort must be > 0";
    }
    if (isDefined(input.windowDaysLong) && input.windowDaysLong <= 0) {
        return "windowDaysLong must be > 0";
    }
    if (
        isDefined(input.forecastWeightShort) &&
        (input.forecastWeightShort < MIN_WEIGHT || input.forecastWeightShort > MAX_WEIGHT)
    ) {
        return "forecastWeightShort must be between 0 and 1";
    }
    if (
        isDefined(input.forecastWeightLong) &&
        (input.forecastWeightLong < MIN_WEIGHT || input.forecastWeightLong > MAX_WEIGHT)
    ) {
        return "forecastWeightLong must be between 0 and 1";
    }
    if (isDefined(input.safetyStockStatsDays) && input.safetyStockStatsDays <= 0) {
        return "safetyStockStatsDays must be > 0";
    }
    if (isDefined(input.serviceLevelZ) && input.serviceLevelZ <= 0) {
        return "serviceLevelZ must be > 0";
    }
    if (isDefined(input.reorderCoverageDays) && input.reorderCoverageDays <= 0) {
        return "reorderCoverageDays must be > 0";
    }
    if (isDefined(input.riskHorizonDays) && input.riskHorizonDays <= 0) {
        return "riskHorizonDays must be > 0";
    }
    if (isDefined(input.deadStockWindowDays) && input.deadStockWindowDays <= 0) {
        return "deadStockWindowDays must be > 0";
    }
    if (
        isDefined(input.deadStockDropMin) &&
        (input.deadStockDropMin < MIN_WEIGHT || input.deadStockDropMin > MAX_WEIGHT)
    ) {
        return "deadStockDropMin must be between 0 and 1";
    }
    if (
        isDefined(input.deadStockDropMax) &&
        (input.deadStockDropMax < MIN_WEIGHT || input.deadStockDropMax > MAX_WEIGHT)
    ) {
        return "deadStockDropMax must be between 0 and 1";
    }

    return null;
}
