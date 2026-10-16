import { z } from "zod";
import { AvailableDemoEvents } from "@queuekit/shared";

/**
 * Optional comma-separated allowlisted event types.
 * Example: ?types=job.completed,job.failed
 */
export const eventsQuerySchema = z.object({
  types: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw || raw.trim() === "") {
        return [...AvailableDemoEvents];
      }

      const parts = raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length === 0) {
        return [...AvailableDemoEvents];
      }

      const invalid = parts.filter(
        (part) =>
          !AvailableDemoEvents.includes(
            part as (typeof AvailableDemoEvents)[number]
          )
      );

      if (invalid.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported event type(s): ${invalid.join(", ")}. Allowed: ${AvailableDemoEvents.join(", ")}`,
        });
        return z.NEVER;
      }

      return parts as Array<(typeof AvailableDemoEvents)[number]>;
    }),
});

export type EventsQueryInput = {
  types: Array<(typeof AvailableDemoEvents)[number]>;
};
