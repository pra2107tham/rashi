import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as logger from "firebase-functions/logger";
import { PLAY_PACKAGE_NAME, PLAY_SERVICE_ACCOUNT, REGION } from "../config";
import { handleDeveloperNotification, type DeveloperNotification } from "../services/billing";

// Topic name must match the one configured in Play Console → Monetization setup → RTDN.
export const playRtdn = onMessagePublished(
  { topic: "play-rtdn", region: REGION, secrets: [PLAY_SERVICE_ACCOUNT], retry: true },
  async (event) => {
    const msg = event.data.message.json as DeveloperNotification;
    if (msg.packageName && msg.packageName !== PLAY_PACKAGE_NAME.value()) {
      logger.warn("rtdn.wrong_package", { packageName: msg.packageName });
      return;
    }
    if (msg.testNotification) {
      logger.info("rtdn.test");
      return;
    }
    await handleDeveloperNotification(msg);
  },
);
