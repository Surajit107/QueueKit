/**
 * Redact secrets, connection URLs, and credential-shaped strings from
 * public error payloads. Never trust upstream messages.
 */

const sensitivePattern = () =>
  /(redis(s)?:\/\/\S+|amqp(s)?:\/\/\S+|mongodb(\+srv)?:\/\/\S+|postgres(ql)?:\/\/\S+|mysql:\/\/\S+|password|passwd|secret|token|authorization|api[_-]?key|private[_-]?key|access[_-]?key|bearer\s+\S+)/i;

const credentialInUrlPattern = () =>
  /([a-z][a-z0-9+.-]*:\/\/)([^/@\s]+@)/i;

export const containsSensitiveData = (value: string): boolean =>
  sensitivePattern().test(value) || credentialInUrlPattern().test(value);

export const sanitizeMessage = (
  message: string,
  options?: { forceGeneric?: boolean }
): string => {
  if (options?.forceGeneric) {
    return "Something went wrong";
  }
  if (!message || containsSensitiveData(message)) {
    return "Something went wrong";
  }
  // Strip absolute Windows/Unix paths that often appear in stacks pasted into messages.
  const withoutPaths = message
    .replace(/[A-Za-z]:\\[^\s]+/g, "[path]")
    .replace(/\/(?:home|Users|var|tmp|app)\/[^\s]+/g, "[path]");
  return withoutPaths.slice(0, 500);
};

/**
 * Deep-sanitize unknown error detail payloads (Zod field errors, etc.).
 */
export const sanitizeErrorDetails = (value: unknown, depth = 0): unknown => {
  if (depth > 4) {
    return "[truncated]";
  }

  if (typeof value === "string") {
    return sanitizeMessage(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeErrorDetails(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (sensitivePattern().test(key)) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = sanitizeErrorDetails(entry, depth + 1);
    }
    return out;
  }

  return "[unserializable]";
};
