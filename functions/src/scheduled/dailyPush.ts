import { onSchedule } from "firebase-functions/v2/scheduler";
import { ANTHROPIC_API_KEY, PII_ENC_KEY, REGION } from "../config";
import { slotOf } from "../lib/dates";
import { runDailySlot } from "../services/notifications";

/** Every 15 minutes: send the morning reading to users whose local notification time is now. */
export const dailyPush = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Etc/UTC",
    region: REGION,
    secrets: [ANTHROPIC_API_KEY, PII_ENC_KEY],
    timeoutSeconds: 540,
    memory: "512MiB",
    retryCount: 0,
  },
  async (event) => {
    const now = new Date(event.scheduleTime);
    await runDailySlot(slotOf(now), now);
  },
);
