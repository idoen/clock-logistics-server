import {
    ensureLogisticsConfigRow,
    getLogisticsConfig,
    updateLogisticsConfig,
} from "../../src/repositories/logisticsConfig.repository";
import { pool } from "../../src/db/pool";

jest.mock("../../src/db/pool", () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe("logisticsConfig.repository", () => {
    it("ensures a config row exists", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

        await ensureLogisticsConfigRow();

        expect(pool.query).toHaveBeenCalled();
    });

    it("gets logistics config", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: true }] });

        const result = await getLogisticsConfig();

        expect(pool.query).toHaveBeenCalled();
        expect(result).toEqual({ id: true });
    });

    it("updates logistics config", async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: true }] });

        const result = await updateLogisticsConfig({ windowDaysShort: 10 });

        expect(pool.query).toHaveBeenCalled();
        expect(result).toEqual({ id: true });
    });
});
