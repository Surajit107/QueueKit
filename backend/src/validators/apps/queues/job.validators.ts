import { z } from "zod";
import { AvailableDemoQueues, DemoJobTypeEnum } from "@queuekit/shared";

/** Cap JSON payload size at validation time (~2KB serialized). */
const boundedPayloadSchema = z
  .record(z.unknown())
  .default({})
  .superRefine((value, ctx) => {
    const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
    if (bytes > 2_048) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payload exceeds 2048 bytes",
      });
    }
  });

export const enqueueJobSchema = z
  .object({
    type: z.enum([
      DemoJobTypeEnum.ECHO,
      DemoJobTypeEnum.DELAY,
      DemoJobTypeEnum.FAIL,
    ]),
    payload: boundedPayloadSchema,
    delayMs: z.number().int().min(0).max(60_000).optional(),
    priority: z.number().int().min(1).max(10).optional(),
  })
  .strict();

const allowlistedQueue = z
  .string()
  .min(1)
  .max(64)
  .refine(
    (value) =>
      AvailableDemoQueues.includes(
        value as (typeof AvailableDemoQueues)[number]
      ),
    {
      message: `Queue must be one of: ${AvailableDemoQueues.join(", ")}`,
    }
  );

export const queueNameParamSchema = z.object({
  queue: allowlistedQueue,
});

export const jobIdParamSchema = z.object({
  queue: allowlistedQueue,
  jobId: z.string().min(1).max(128),
});

export const listJobsQuerySchema = z.object({
  start: z.coerce.number().int().min(0).max(200).optional(),
  end: z.coerce.number().int().min(0).max(200).optional(),
});

export type EnqueueJobInput = z.infer<typeof enqueueJobSchema>;
export type ListJobsQueryInput = z.infer<typeof listJobsQuerySchema>;
