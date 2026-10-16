import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import requestIp from "request-ip";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { getEnv } from "@/config/env.js";
import morganMiddleware from "@/logger/morgan.logger.js";
import { errorHandler } from "@/middlewares/error.middlewares.js";
import { createGlobalRateLimiter } from "@/middlewares/rateLimit.middlewares.js";
import {
  rejectUnsafeRedisForwarder,
  UNSAFE_REDIS_FORWARDER_PATHS,
} from "@/middlewares/rejectUnsafe.middlewares.js";
import demoResetRouter from "@/routes/apps/demo/reset.routes.js";
import queueJobRouter from "@/routes/apps/queues/job.routes.js";
import redisDemoRouter from "@/routes/apps/redis/demo.routes.js";
import eventsRouter from "@/routes/events.routes.js";
import healthcheckRouter from "@/routes/healthcheck.routes.js";
import statusRouter from "@/routes/status.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = getEnv();

const openapiPath = path.resolve(__dirname, "./openapi.yaml");
const openapiFile = fs.readFileSync(openapiPath, "utf8");
const apiHostUrl = env.QUEUEKIT_API_HOST_URL.replace(/\/$/, "");
const swaggerDocument = YAML.parse(
  openapiFile.replace("- url: ${{server}}", `- url: ${apiHostUrl}/api/v1`)
) as {
  servers?: Array<{ url: string; description?: string }>;
  [key: string]: unknown;
};

swaggerDocument.servers = [
  {
    url: `${apiHostUrl}/api/v1`,
    description: "QueueKit API",
  },
];

const app = express();

app.set("trust proxy", 1);

/** Explicit frontend origin allowlist (comma-separated CORS_ORIGIN). */
const allowedOrigins = new Set(
  env.CORS_ORIGIN === "*"
    ? []
    : env.CORS_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser / same-origin tools (curl, server-to-server) send no Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (env.CORS_ORIGIN === "*" || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: env.CORS_ORIGIN !== "*",
  })
);

app.use(requestIp.mw());
app.use(createGlobalRateLimiter());

app.use(express.json({ limit: env.BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.BODY_SIZE_LIMIT }));

app.use(morganMiddleware);

// Ops / health (root-mounted, matching product + PRAXIS patterns)
app.use("/", healthcheckRouter);

// Explicitly reject Redis command forwarder probes (must never be implemented).
for (const unsafePath of UNSAFE_REDIS_FORWARDER_PATHS) {
  app.all(unsafePath, rejectUnsafeRedisForwarder);
}

// Versioned API — allowlisted demo operations only (no generic Redis/queue admin).
app.use("/api/v1/status", statusRouter);
app.use("/api/v1/redis/demo", redisDemoRouter);
app.use("/api/v1/queues", queueJobRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/demo", demoResetRouter);

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
      docExpansion: "none",
    },
    customSiteTitle: "QueueKit API docs",
  })
);

app.get("/", (_req, res) => {
  res.redirect("/docs");
});

app.use(errorHandler);

export { app };
