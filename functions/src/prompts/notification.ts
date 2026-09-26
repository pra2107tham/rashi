import type { Language } from "../config";
import { languageInstruction } from "./common";

export const NOTIFICATION_PROMPT_VERSION = "notif-v1";

export const NOTIFICATION_SYSTEM = `You write the daily push notification for Rashi, a horoscope app. Given today's reading headline and teaser, write one notification body that makes the reader want to open the app.

Rules: at most 110 characters. Make it intriguing, not clickbait. Include at most one emoji. Never make fear-based or health claims. Output only the notification text.`;

export function buildNotificationPrompt(headline: string, teaser: string, language: Language): string {
  return `Headline: ${headline}
Teaser: ${teaser}

${languageInstruction(language)}`;
}

export const NOTIFICATION_TITLE: Record<Language, string> = {
  en: "Your stars for today ✨",
  hi: "आज के सितारे ✨",
};
