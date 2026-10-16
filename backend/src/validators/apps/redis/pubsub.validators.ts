import { z } from "zod";
import {
  AvailableDemoPubSubChannels,
  type DemoPubSubChannel,
} from "@queuekit/shared";
import { REDIS_BOUNDS } from "@queuekit/redis-toolkit";

const channelSchema = z.enum(
  AvailableDemoPubSubChannels as [DemoPubSubChannel, ...DemoPubSubChannel[]]
);

export const publishPubSubSchema = z
  .object({
    channel: channelSchema,
    message: z
      .string()
      .min(1)
      .max(REDIS_BOUNDS.MAX_PUBSUB_MESSAGE_BYTES),
  })
  .strict();

/**
 * ?channels=lobby,lab — empty means all allowlisted channels.
 */
export const pubSubEventsQuerySchema = z.object({
  channels: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw || raw.trim() === "") {
        return [...AvailableDemoPubSubChannels];
      }

      const parts = raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length === 0) {
        return [...AvailableDemoPubSubChannels];
      }

      const invalid = parts.filter(
        (part) => !AvailableDemoPubSubChannels.includes(part as DemoPubSubChannel)
      );

      if (invalid.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported channel(s): ${invalid.join(", ")}. Allowed: ${AvailableDemoPubSubChannels.join(", ")}`,
        });
        return z.NEVER;
      }

      return [...new Set(parts)] as DemoPubSubChannel[];
    }),
});

export type PublishPubSubInput = z.infer<typeof publishPubSubSchema>;
export type PubSubEventsQueryInput = {
  channels: DemoPubSubChannel[];
};
