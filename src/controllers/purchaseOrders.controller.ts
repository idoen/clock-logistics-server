import { Request, Response, NextFunction } from "express";
import {
    createPurchaseOrder as createPurchaseOrderRecord,
    listPurchaseOrders as listPurchaseOrderRecords,
} from "../repositories/purchaseOrders.repository";
import { validatePurchaseOrderInput } from "../utils/purchaseOrderLogic";

type CreatePOBody = {
    productId: number;
    qtyOrdered: number;
    expectedArrival?: string; // YYYY-MM-DD
};

export async function listPurchaseOrders(_req: Request, res: Response, next: NextFunction) {
    try {
        const records = await listPurchaseOrderRecords();
        res.json(records);
    } catch (e) {
        next(e);
    }
}

export async function createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body as CreatePOBody;

        const validationError = validatePurchaseOrderInput(body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const record = await createPurchaseOrderRecord({
            productId: body.productId,
            qtyOrdered: body.qtyOrdered,
            expectedArrival: body.expectedArrival ?? null,
        });

        res.status(201).json(record);
    } catch (e) {
        next(e);
    }
}
