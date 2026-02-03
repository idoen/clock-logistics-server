import request from "supertest";
import { app } from "../../src/app";
import {
    applyLogisticsConfigUpdate,
    fetchLogisticsConfig,
} from "../../src/services/logisticsConfig.service";

jest.mock("../../src/services/logisticsConfig.service", () => ({
    applyLogisticsConfigUpdate: jest.fn(),
    fetchLogisticsConfig: jest.fn(),
}));

describe("logistics config API", () => {
    it("returns 404 when config missing", async () => {
        (fetchLogisticsConfig as jest.Mock).mockResolvedValue(null);

        const response = await request(app).get("/api/logistics-config").expect(404);

        expect(response.body).toEqual({ error: "Config not found" });
    });

    it("returns config when found", async () => {
        (fetchLogisticsConfig as jest.Mock).mockResolvedValue({ id: true });

        const response = await request(app).get("/api/logistics-config").expect(200);

        expect(response.body).toEqual({ id: true });
    });

    it("handles validation errors", async () => {
        (applyLogisticsConfigUpdate as jest.Mock).mockResolvedValue({ error: "bad" });

        const response = await request(app)
            .patch("/api/logistics-config")
            .send({ windowDaysShort: 5 })
            .expect(400);

        expect(response.body).toEqual({ error: "bad" });
    });

    it("handles not found on update", async () => {
        (applyLogisticsConfigUpdate as jest.Mock).mockResolvedValue({ notFound: true });

        const response = await request(app)
            .patch("/api/logistics-config")
            .send({ windowDaysShort: 5 })
            .expect(404);

        expect(response.body).toEqual({ error: "Config not found" });
    });

    it("returns updated config", async () => {
        (applyLogisticsConfigUpdate as jest.Mock).mockResolvedValue({ config: { id: true } });

        const response = await request(app)
            .patch("/api/logistics-config")
            .send({ windowDaysShort: 5 })
            .expect(200);

        expect(response.body).toEqual({ id: true });
    });
});
