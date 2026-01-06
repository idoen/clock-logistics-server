import { validatePurchaseOrderInput } from "../../src/utils/purchaseOrderLogic";

describe("validatePurchaseOrderInput", () => {
    it("returns error when required fields are missing", () => {
        expect(validatePurchaseOrderInput({})).toBe("productId and qtyOrdered are required");
    });

    it("returns error when qtyOrdered is not positive", () => {
        expect(validatePurchaseOrderInput({ productId: 1, qtyOrdered: 0 })).toBe(
            "qtyOrdered must be > 0"
        );
    });

    it("returns null for valid input", () => {
        expect(validatePurchaseOrderInput({ productId: 1, qtyOrdered: 5 })).toBeNull();
    });
});
