import type { Request } from "express";
import { resetDemoResources } from "@/services/demo-reset.service.js";
import { ApiResponse } from "@queuekit/shared";
import { asyncHandler } from "@/utils/asyncHandler.js";
import type { DemoResetInput } from "@/validators/apps/demo/reset.validators.js";

const resetDemo = asyncHandler(async (req: Request, res) => {
  const body = req.body as DemoResetInput;
  const result = await resetDemoResources(body.confirm);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Demo resources reset successfully"));
});

export { resetDemo };
