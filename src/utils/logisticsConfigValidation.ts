import { LogisticsConfigUpdateInput } from "../types/logisticsConfig";

const MIN_WEIGHT = 0;
const MAX_WEIGHT = 1;
const FORECAST_WEIGHT_TOLERANCE = 0.001;

const dayFields: Array<keyof LogisticsConfigUpdateInput> = [
    "windowDaysShort",
    "windowDaysLong",
    "safetyStockStatsDays",
    "reorderCoverageDays",
    "riskHorizonDays",
    "deadStockWindowDays",
];

const weightFields: Array<keyof LogisticsConfigUpdateInput> = [
    "forecastWeightShort",
    "forecastWeightLong",
    "deadStockDropMin",
    "deadStockDropMax",
];

const allKnownFields: Array<keyof LogisticsConfigUpdateInput> = [
    ...dayFields,
    ...weightFields,
    "serviceLevelZ",
];

function isNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function validateLogisticsConfigUpdate(input: LogisticsConfigUpdateInput): string | null {
    const hasUpdate = allKnownFields.some((key) => input[key] !== undefined);
    if (!hasUpdate) {
        return "At least one field is required";
    }

    for (const key of allKnownFields) {
        const value = input[key];
        if (value === undefined) continue;
        if (!isNumber(value)) {
            return `${String(key)} must be a number`;
        }
    }

    for (const key of dayFields) {
        const value = input[key];
        if (value === undefined) continue;
        if (!Number.isInteger(value)) {
            return `${String(key)} must be an integer`;
        }
        if (value <= 0) {
            return `${String(key)} must be > 0`;
        }
    }

    if (input.serviceLevelZ !== undefined) {
        if (input.serviceLevelZ <= 0) {
            return "serviceLevelZ must be > 0";
        }
    }

    for (const key of weightFields) {
        const value = input[key];
        if (value === undefined) continue;
        if (value < MIN_WEIGHT || value > MAX_WEIGHT) {
            return `${String(key)} must be between 0 and 1`;
        }
    }

    if (
        input.deadStockDropMin !== undefined &&
        input.deadStockDropMax !== undefined &&
        input.deadStockDropMin > input.deadStockDropMax
    ) {
        return "deadStockDropMin must be <= deadStockDropMax";
    }

    if (
        input.forecastWeightShort !== undefined &&
        input.forecastWeightLong !== undefined
    ) {
        const sum = input.forecastWeightShort + input.forecastWeightLong;
        if (Math.abs(sum - 1) > FORECAST_WEIGHT_TOLERANCE) {
            return "Forecast weights must sum to 1";
        }
    }

    return null;
}
