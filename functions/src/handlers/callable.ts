import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import type { SecretParam } from "firebase-functions/params";
import type { z } from "zod";
import { IS_EMULATOR, REGION } from "../config";
import { HttpsError } from "../lib/errors";
import { enforceRateLimit } from "../lib/rateLimit";
import { parseInput } from "../lib/validate";

interface CallableOptions {
  secrets?: SecretParam[];
  timeoutSeconds?: number;
  memory?: "256MiB" | "512MiB" | "1GiB";
  minInstances?: number;
  rateLimit?: { bucket: string; perMinute: number };
}

/** Auth + App Check + rate limit + zod validation around a service call. */
export function callable<S extends z.ZodType, R>(
  schema: S,
  handler: (uid: string, data: z.infer<S>, req: CallableRequest) => Promise<R>,
  opts: CallableOptions = {},
) {
  return onCall(
    {
      region: REGION,
      enforceAppCheck: !IS_EMULATOR,
      timeoutSeconds: opts.timeoutSeconds ?? 60,
      memory: opts.memory ?? "256MiB",
      // firebase-functions rejects keys that are present but undefined.
      ...(opts.secrets ? { secrets: opts.secrets } : {}),
      ...(opts.minInstances !== undefined ? { minInstances: opts.minInstances } : {}),
    },
    async (req) => {
      const uid = req.auth?.uid;
      if (!uid) throw new HttpsError("unauthenticated", "Sign in first");
      if (opts.rateLimit) await enforceRateLimit(uid, opts.rateLimit.bucket, opts.rateLimit.perMinute);
      return handler(uid, parseInput(schema, req.data ?? {}), req);
    },
  );
}
