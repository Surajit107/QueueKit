import {
  ApiError,
  ApiResponse,
  DEMO_REDIS_NAMESPACE,
  ErrorCode,
} from "@queuekit/shared";

describe("API contracts (@queuekit/shared)", () => {
  it("exposes demo namespace constant", () => {
    expect(DEMO_REDIS_NAMESPACE).toBe("queuekit:demo:");
  });

  it("ApiResponse marks success for 2xx", () => {
    const response = new ApiResponse(200, { ok: true }, "done");
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ ok: true });
  });

  it("ApiError carries status, code, and public body", () => {
    const error = new ApiError(
      400,
      "bad",
      [{ field: "required" }],
      "",
      ErrorCode.VALIDATION_FAILED
    );
    expect(error.statusCode).toBe(400);
    expect(error.success).toBe(false);
    expect(error.errors).toEqual([{ field: "required" }]);
    expect(error.toPublicBody()).toMatchObject({
      statusCode: 400,
      success: false,
      code: ErrorCode.VALIDATION_FAILED,
    });
  });
});
