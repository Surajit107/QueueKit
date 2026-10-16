import { Router } from "express";
import {
  cacheAside,
  counter,
  createKey,
  listKeys,
  rateLimit,
  readKey,
  removeKey,
  structure,
} from "@/controllers/apps/redis/demo.controllers.js";
import {
  listChannels,
  publish,
  streamPubSubEvents,
} from "@/controllers/apps/redis/pubsub.controllers.js";
import { createPubSubPublishRateLimiter } from "@/middlewares/rateLimit.middlewares.js";
import { validate } from "@/validators/validate.js";
import {
  createDemoKeySchema,
  demoKeyParamSchema,
} from "@/validators/apps/redis/demo-key.validators.js";
import {
  cacheAsideSchema,
  counterDemoSchema,
  rateLimitDemoSchema,
  structureDemoSchema,
} from "@/validators/apps/redis/demo-ops.validators.js";
import {
  publishPubSubSchema,
  pubSubEventsQuerySchema,
} from "@/validators/apps/redis/pubsub.validators.js";

const router = Router();

router
  .route("/keys")
  .get(listKeys)
  .post(validate(createDemoKeySchema), createKey);

router
  .route("/keys/:key")
  .get(validate(demoKeyParamSchema, "params"), readKey)
  .delete(validate(demoKeyParamSchema, "params"), removeKey);

router.route("/cache").post(validate(cacheAsideSchema), cacheAside);
router.route("/rate-limit").post(validate(rateLimitDemoSchema), rateLimit);
router.route("/counter").post(validate(counterDemoSchema), counter);
router.route("/structures").post(validate(structureDemoSchema), structure);

router.route("/pubsub/channels").get(listChannels);
router
  .route("/pubsub/publish")
  .post(
    createPubSubPublishRateLimiter(),
    validate(publishPubSubSchema),
    publish
  );
router
  .route("/pubsub/events")
  .get(validate(pubSubEventsQuerySchema, "query"), streamPubSubEvents);

export default router;
