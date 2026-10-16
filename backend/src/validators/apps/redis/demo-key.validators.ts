import { z } from "zod";

export const createDemoKeySchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(64)
      .regex(
        /^[a-zA-Z0-9:_-]+$/,
        "Key may only contain letters, numbers, :, _, -"
      ),
    value: z.string().min(1).max(1024),
    ttlSeconds: z.number().int().positive().max(86_400).optional(),
  })
  .strict();

export const demoKeyParamSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9:_-]+$/),
});

export type CreateDemoKeyInput = z.infer<typeof createDemoKeySchema>;
