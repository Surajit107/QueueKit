/** Hard caps for public demo / reusable helpers — avoid exhausting free Redis. */
export const REDIS_BOUNDS = {
  MAX_KEY_SUFFIX_LENGTH: 64,
  MAX_STRING_BYTES: 1024,
  MAX_LIST_LENGTH: 50,
  MAX_SET_MEMBERS: 50,
  MAX_HASH_FIELDS: 50,
  MAX_ZSET_MEMBERS: 50,
  MAX_KEYS_LIST: 100,
  SCAN_COUNT: 50,
  MAX_TTL_SECONDS: 86_400,
  MIN_RATE_LIMIT: 1,
  MAX_RATE_LIMIT: 1_000,
  MIN_RATE_WINDOW_MS: 1_000,
  MAX_RATE_WINDOW_MS: 3_600_000,
  /** Pub/Sub message body cap (bytes / UTF-8 string length). */
  MAX_PUBSUB_MESSAGE_BYTES: 256,
  /** Max channels per subscribe() call (no PSUBSCRIBE). */
  MAX_PUBSUB_CHANNELS_PER_SUB: 8,
} as const;
