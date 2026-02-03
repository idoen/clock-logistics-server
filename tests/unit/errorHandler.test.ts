import { errorHandler } from "../../src/middleware/errorHandler";

describe("errorHandler", () => {
    it("returns 500 with error payload", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

        const json = jest.fn();
        const status = jest.fn(() => ({ json }));

        errorHandler(new Error("boom"), {} as never, { status } as never, {} as never);

        expect(consoleSpy).toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({ error: "Internal Server Error" });

        consoleSpy.mockRestore();
    });
});
