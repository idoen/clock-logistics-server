export type CreatePurchaseOrderInput = {
    productId?: number;
    qtyOrdered?: number;
    expectedArrival?: string;
};

export function validatePurchaseOrderInput(body: CreatePurchaseOrderInput): string | null {
    if (!body?.productId || !body?.qtyOrdered) {
        return "productId and qtyOrdered are required";
    }
    if (body.qtyOrdered <= 0) {
        return "qtyOrdered must be > 0";
    }
    return null;
}
