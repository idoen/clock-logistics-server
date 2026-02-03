import {
    applyLogisticsConfigUpdate,
    fetchLogisticsConfig,
} from "../../src/services/logisticsConfig.service";
import {
    ensureLogisticsConfigRow,
    getLogisticsConfig,
    updateLogisticsConfig,
} from "../../src/repositories/logisticsConfig.repository";
import { validateLogisticsConfigUpdate } from "../../src/utils/logisticsConfigValidation";

jest.mock("../../src/repositories/logisticsConfig.repository", () => ({
    ensureLogisticsConfigRow: jest.fn(),
    getLogisticsConfig: jest.fn(),
    updateLogisticsConfig: jest.fn(),
}));

jest.mock("../../src/utils/logisticsConfigValidation", () => ({
    validateLogisticsConfigUpdate: jest.fn(),
}));

const mockConfig = {
    id: true,
    window_days_short: 7,
    window_days_long: 30,
    forecast_weight_short: 0.5,
    forecast_weight_long: 0.5,
    safety_stock_stats_days: 30,
    service_level_z: 1.2,
    reorder_coverage_days: 14,
    risk_horizon_days: 60,
    dead_stock_window_days: 90,
    dead_stock_drop_min: 0.1,
    dead_stock_drop_max: 0.5,
    updated_at: "2030-01-01T00:00:00Z",
};

describe("logisticsConfig.service", () => {
    beforeEach(() => {
        (validateLogisticsConfigUpdate as jest.Mock).mockReturnValue(null);
        (ensureLogisticsConfigRow as jest.Mock).mockResolvedValue(undefined);
    });

    it("fetches config after ensuring row exists", async () => {
        (getLogisticsConfig as jest.Mock).mockResolvedValue(mockConfig);

        const result = await fetchLogisticsConfig();

        expect(ensureLogisticsConfigRow).toHaveBeenCalled();
        expect(result).toEqual(mockConfig);
    });

    it("returns validation errors", async () => {
        (validateLogisticsConfigUpdate as jest.Mock).mockReturnValue("bad");

        const result = await applyLogisticsConfigUpdate({ windowDaysShort: 5 });

        expect(result).toEqual({ error: "bad" });
    });

    it("returns notFound when no current config", async () => {
        (getLogisticsConfig as jest.Mock).mockResolvedValue(null);

        const result = await applyLogisticsConfigUpdate({ windowDaysShort: 5 });

        expect(result).toEqual({ notFound: true });
    });

    it("validates forecast weights sum to 1", async () => {
        (getLogisticsConfig as jest.Mock).mockResolvedValue(mockConfig);

        const result = await applyLogisticsConfigUpdate({ forecastWeightShort: 0.2 });

        expect(result).toEqual({ error: "Forecast weights must sum to 1" });
    });

    it("validates dead stock drop range", async () => {
        (getLogisticsConfig as jest.Mock).mockResolvedValue(mockConfig);

        const result = await applyLogisticsConfigUpdate({ deadStockDropMin: 0.9 });

        expect(result).toEqual({ error: "deadStockDropMin must be <= deadStockDropMax" });
    });

    it("updates config when valid", async () => {
        (getLogisticsConfig as jest.Mock).mockResolvedValue(mockConfig);
        (updateLogisticsConfig as jest.Mock).mockResolvedValue({
            ...mockConfig,
            window_days_short: 10,
        });

        const result = await applyLogisticsConfigUpdate({ windowDaysShort: 10 });

        expect(updateLogisticsConfig).toHaveBeenCalledWith({ windowDaysShort: 10 });
        expect(result).toEqual({ config: { ...mockConfig, window_days_short: 10 } });
    });

    it("returns notFound when update returns null", async () => {
        (getLogisticsConfig as jest.Mock).mockResolvedValue(mockConfig);
        (updateLogisticsConfig as jest.Mock).mockResolvedValue(null);

        const result = await applyLogisticsConfigUpdate({ windowDaysShort: 10 });

        expect(result).toEqual({ notFound: true });
    });
});
