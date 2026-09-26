import { randomBytes } from "node:crypto";

// Runs before modules load: point the Admin SDK at the emulator and provide secrets.
process.env.GCLOUD_PROJECT ??= "demo-rashi";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.PII_ENC_KEY = randomBytes(32).toString("base64");
process.env.OPENROUTER_API_KEY = "test";
process.env.SARVAM_API_KEY = "test";
process.env.PLAY_PACKAGE_NAME = "com.rashi.app";

export async function clearFirestore(): Promise<void> {
  const res = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`clear failed: ${res.status}`);
}
