import { validateLogisticsConfigUpdate } from "../../src/utils/logisticsConfigValidation";

describe("validateLogisticsConfigUpdate", () => {
    it("requires at least one field", () => {
        expect(validateLogisticsConfigUpdate({})).toBe("At least one field is required");
    });

    it("rejects non-numeric fields", () => {
        expect(
            validateLogisticsConfigUpdate({ windowDaysShort: Number("nan") })
        ).toBe("windowDaysShort must be a number");
    });

    it("enforces integer day fields", () => {
        expect(validateLogisticsConfigUpdate({ windowDaysShort: 2.5 })).toBe(
            "windowDaysShort must be an integer"
        );
    });

    it("requires positive day fields", () => {
        expect(validateLogisticsConfigUpdate({ windowDaysShort: 0 })).toBe(
            "windowDaysShort must be > 0"
        );
    });

    it("validates service level z score", () => {
        expect(validateLogisticsConfigUpdate({ serviceLevelZ: 0 })).toBe(
            "serviceLevelZ must be > 0"
        );
    });

    it("validates weight ranges", () => {
        expect(validateLogisticsConfigUpdate({ forecastWeightShort: 2 })).toBe(
            "forecastWeightShort must be between 0 and 1"
        );
    });

    it("checks dead stock min/max ordering", () => {
        expect(
            validateLogisticsConfigUpdate({ deadStockDropMin: 0.8, deadStockDropMax: 0.2 })
        ).toBe("deadStockDropMin must be <= deadStockDropMax");
    });

    it("checks forecast weights sum", () => {
        expect(
            validateLogisticsConfigUpdate({ forecastWeightShort: 0.4, forecastWeightLong: 0.4 })
        ).toBe("Forecast weights must sum to 1");
    });

    it("accepts valid payload", () => {
        expect(
            validateLogisticsConfigUpdate({ windowDaysShort: 7, forecastWeightShort: 0.6 })
        ).toBeNull();
    });
});
