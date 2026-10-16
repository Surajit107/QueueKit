import type { Request } from "express";
import { ApiResponse } from "@queuekit/shared";
import {
  deleteDemoKey,
  getDemoKey,
  listDemoKeys,
  runCacheAsideDemo,
  runCounterDemo,
  runRateLimitDemo,
  runStructureDemo,
  setDemoKey,
} from "@/services/redis-demo.service.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import type { CreateDemoKeyInput } from "@/validators/apps/redis/demo-key.validators.js";
import type {
  CacheAsideInput,
  CounterDemoInput,
  RateLimitDemoInput,
  StructureDemoInput,
} from "@/validators/apps/redis/demo-ops.validators.js";

const listKeys = asyncHandler(async (_req, res) => {
  const keys = await listDemoKeys();
  return res
    .status(200)
    .json(new ApiResponse(200, { keys }, "Demo keys listed successfully"));
});

const createKey = asyncHandler(async (req: Request, res) => {
  const body = req.body as CreateDemoKeyInput;
  const result = await setDemoKey(body);
  return res
    .status(201)
    .json(new ApiResponse(201, result, "Demo key created successfully"));
});

const readKey = asyncHandler(async (req, res) => {
  const key = String(req.params.key);
  const result = await getDemoKey(key);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Demo key fetched successfully"));
});

const removeKey = asyncHandler(async (req, res) => {
  const key = String(req.params.key);
  const result = await deleteDemoKey(key);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Demo key deleted successfully"));
});

const cacheAside = asyncHandler(async (req: Request, res) => {
  const body = req.body as CacheAsideInput;
  const result = await runCacheAsideDemo(body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Cache-aside demo completed"));
});

const rateLimit = asyncHandler(async (req: Request, res) => {
  const body = req.body as RateLimitDemoInput;
  const result = await runRateLimitDemo(body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Rate-limit demo completed"));
});

const counter = asyncHandler(async (req: Request, res) => {
  const body = req.body as CounterDemoInput;
  const result = await runCounterDemo(body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Counter demo completed"));
});

const structure = asyncHandler(async (req: Request, res) => {
  const body = req.body as StructureDemoInput;
  const result = await runStructureDemo(body);
  return res
    .status(200)
    .json(new ApiResponse(200, { result }, "Structure demo completed"));
});

export {
  listKeys,
  createKey,
  readKey,
  removeKey,
  cacheAside,
  rateLimit,
  counter,
  structure,
};
