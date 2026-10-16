import { Router } from "express";
import { resetDemo } from "@/controllers/apps/demo/reset.controllers.js";
import { createDemoResetRateLimiter } from "@/middlewares/rateLimit.middlewares.js";
import { validate } from "@/validators/validate.js";
import { demoResetSchema } from "@/validators/apps/demo/reset.validators.js";

const router = Router();
const demoResetLimiter = createDemoResetRateLimiter();

router
  .route("/reset")
  .post(demoResetLimiter, validate(demoResetSchema), resetDemo);

export default router;
