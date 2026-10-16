import { createServer } from "node:http";
import connectRedis, { disconnectRedis } from "@/cache/redis.js";
import { loadEnv } from "@/config/env.js";
import logger from "@/logger/winston.logger.js";
import connectQueues, { disconnectQueues } from "@/queues/index.js";
import { startWorker, stopWorker } from "@/worker/index.js";

// Env is loaded via `tsx --env-file=.env` (dev) or process env (prod).
const env = loadEnv();

const { app } = await import("@/app.js");

const httpServer = createServer(app);
let isShuttingDown = false;

const startServer = (): void => {
  httpServer.listen(env.PORT, () => {
    logger.info(
      `Docs: http://localhost:${env.PORT}/docs`
    );
    logger.info(`Server running on port ${env.PORT}`);
  });
};

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);

  httpServer.close(async () => {
    try {
      await stopWorker();
      await disconnectQueues();
      await disconnectRedis();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error("Shutdown error: ", error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
};

const boot = async (): Promise<void> => {
  await connectRedis();
  await connectQueues();

  if (env.RUN_WORKER) {
    await startWorker();
  }

  startServer();
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

try {
  await boot();
} catch (error) {
  logger.error("Boot failed: ", error);
  process.exit(1);
}

export { app, httpServer };
