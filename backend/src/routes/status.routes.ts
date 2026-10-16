import { Router } from "express";
import { getStatus } from "@/controllers/status.controllers.js";

const router = Router();

router.route("/").get(getStatus);

export default router;
