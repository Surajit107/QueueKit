import { z } from "zod";
import { DEMO_REDIS_NAMESPACE } from "@queuekit/shared";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  QUEUEKIT_API_HOST_URL: z.string().url().default("http://localhost:8000"),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .default("http://localhost:3000,http://127.0.0.1:3000"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  REDIS_KEY_PREFIX: z
    .string()
    .min(1)
    .default(DEMO_REDIS_NAMESPACE)
    .refine((value) => value.endsWith(":"), {
      message: "REDIS_KEY_PREFIX must end with ':'",
    }),
  BODY_SIZE_LIMIT: z.string().default("16kb"),
  /** Global public API rate limit window (default 15 minutes). */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  /** Global public API max requests per IP per window (default 500). */
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(500),
  /** Job enqueue rate limit window (default 60 seconds). */
  JOB_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  /** Max job enqueues per IP per job window (default 20). */
  JOB_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  /** Demo reset rate limit window (default 15 minutes). */
  RESET_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900_000),
  /** Max demo resets per IP per reset window (default 5). */
  RESET_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  /** Pub/Sub publish rate limit window (default 60 seconds). */
  PUBSUB_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),
  /** Max Pub/Sub publishes per IP per window (default 30). */
  PUBSUB_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  RUN_WORKER: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validate process.env once and fail fast on missing/invalid required vars.
 */
export const loadEnv = (raw: NodeJS.ProcessEnv = process.env): Env => {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};

export const getEnv = (): Env => {
  if (!cachedEnv) {
    return loadEnv();
  }
  return cachedEnv;
};

/**
 * Test helper — clear cached env between Vitest cases.
 */
export const resetEnvCache = (): void => {
  cachedEnv = null;
};
