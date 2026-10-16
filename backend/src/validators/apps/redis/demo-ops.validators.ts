import { z } from "zod";

export const cacheAsideSchema = z
  .object({
    forceMiss: z.boolean().optional(),
  })
  .strict()
  .default({});

export const rateLimitDemoSchema = z
  .object({
    bucket: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[a-zA-Z0-9:_-]+$/)
      .optional(),
    limit: z.number().int().min(1).max(1000).optional(),
    windowMs: z.number().int().min(1000).max(3_600_000).optional(),
  })
  .strict()
  .default({});

export const counterDemoSchema = z
  .object({
    op: z.enum(["incr", "decr", "get"]).default("incr"),
    by: z.number().int().min(1).max(1000).optional(),
  })
  .strict()
  .default({});

const demoKeySuffix = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9:_-]+$/);

export const structureDemoSchema = z
  .object({
    kind: z.enum(["hash", "list", "set", "zset"]),
    key: demoKeySuffix,
    field: z.string().min(1).max(64).optional(),
    value: z.string().min(1).max(1024).optional(),
    member: z.string().min(1).max(64).optional(),
    score: z.number().finite().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.kind === "hash" && (!value.field || value.value === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "hash requires field and value",
      });
    }
    if (value.kind === "list" && value.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "list requires value",
      });
    }
    if (value.kind === "set" && !value.member) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "set requires member",
      });
    }
    if (
      value.kind === "zset" &&
      (!value.member || value.score === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "zset requires member and score",
      });
    }
  });

export type CacheAsideInput = z.infer<typeof cacheAsideSchema>;
export type RateLimitDemoInput = z.infer<typeof rateLimitDemoSchema>;
export type CounterDemoInput = z.infer<typeof counterDemoSchema>;
export type StructureDemoInput = z.infer<typeof structureDemoSchema>;
