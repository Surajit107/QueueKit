import { z } from "zod";

export const demoResetSchema = z
  .object({
    confirm: z
      .literal(true)
      .describe("Must be true to reset demo resources"),
  })
  .strict();

export type DemoResetInput = z.infer<typeof demoResetSchema>;
