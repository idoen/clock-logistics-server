import { toCsv } from "../../src/utils/csv";

describe("toCsv", () => {
    it("renders headers and rows with escaping", () => {
        const csv = toCsv(
            [
                { name: "Watch, Gold", sku: 'W"1', available: 2 },
                { name: "Simple", sku: "S1", available: null },
            ],
            [
                { key: "name", header: "Name" },
                { key: "sku", header: "SKU" },
                { key: "available", header: "Available" },
            ]
        );

        expect(csv).toBe(
            'Name,SKU,Available\n"Watch, Gold","W""1",2\nSimple,S1,'
        );
    });
});
