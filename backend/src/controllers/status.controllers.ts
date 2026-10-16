import { getSystemStatus } from "@/services/status.service.js";
import { ApiResponse } from "@queuekit/shared";
import { asyncHandler } from "@/utils/asyncHandler.js";

/**
 * GET /api/v1/status — API, Redis, worker status (honest unknown/offline).
 */
const getStatus = asyncHandler(async (_req, res) => {
  const status = await getSystemStatus();
  return res
    .status(200)
    .json(new ApiResponse(200, status, "System status fetched successfully"));
});

export { getStatus };
