import { Router } from "express";
import {
  healthcheck,
  ready,
  version,
} from "@/controllers/healthcheck.controllers.js";

const router = Router();

router.route("/health").get(healthcheck);
router.route("/ready").get(ready);
router.route("/version").get(version);

export default router;
