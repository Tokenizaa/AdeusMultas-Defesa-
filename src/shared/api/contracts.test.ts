import { describe, expect, it } from "vitest";
import { apiError, apiSuccess } from "./contracts";

describe("API contracts", () => {
  it("creates the canonical success envelope", () => {
    expect(apiSuccess({ id: "case_1" }, "req_1")).toEqual({
      ok: true,
      data: { id: "case_1" },
      requestId: "req_1",
    });
  });

  it("creates the canonical error envelope", () => {
    expect(apiError("VALIDATION_ERROR", "Campo inválido", {
      requestId: "req_2",
      details: { field: "aitNumber" },
    })).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Campo inválido",
        details: { field: "aitNumber" },
        requestId: "req_2",
      },
    });
  });
});
