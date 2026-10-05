import { Alert } from "react-native";
import { t } from "./i18n";
import { useApp } from "./store";

/**
 * Google Play Billing isn't wired yet: it only works for apps installed from the Play Store.
 * Product ids already match the backend (functions/src/config.ts PRODUCTS).
 */
export type ProductId = "reading_unlock" | "rashi_plus_weekly" | "rashi_plus_yearly" | "chat_credits_10";

export function purchase(_productId: ProductId, _readingId?: string): void {
  const lang = useApp.getState().language ?? "en";
  Alert.alert(t("paymentsSoonTitle", lang), t("paymentsSoonBody", lang));
}
