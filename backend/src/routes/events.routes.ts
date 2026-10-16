import { Router } from "express";
import { streamEvents } from "@/controllers/events.controllers.js";
import { eventsQuerySchema } from "@/validators/apps/events/events.validators.js";
import { validate } from "@/validators/validate.js";

const router = Router();

router
  .route("/")
  .get(validate(eventsQuerySchema, "query"), streamEvents);

export default router;
