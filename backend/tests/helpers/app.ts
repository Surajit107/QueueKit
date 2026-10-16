import { loadEnv, resetEnvCache } from "@/config/env.js";

/**
 * Build the Express app with validated env (no Redis connect).
 */
export const createTestApp = async () => {
  resetEnvCache();
  loadEnv();
  const { app } = await import("@/app.js");
  return app;
};
