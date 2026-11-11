import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Txt } from "../components/Txt";
import { Button, IconButton, Screen } from "../components/ui";
import { purchase } from "../lib/billing";
import { useT } from "../lib/i18n";
import { colors, radius } from "../theme";

export default function PaywallScreen() {
  const { period, readingId, reason } = useLocalSearchParams<{ period?: string; readingId?: string; reason?: string }>();
  const { tr, alt } = useT();
  const titleKey = reason === "chat" ? "paywallTitleChat" : period === "month" ? "paywallTitleMonth" : "paywallTitleWeek";

  return (
    <Screen diamondY={0.8}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <IconButton name="close" onPress={() => router.back()} />
        <Txt variant="title" style={{ marginTop: 24 }}>{tr(titleKey)}</Txt>
        <Txt variant="caption" style={{ marginTop: 10, fontSize: 14 }}>{alt(titleKey)}</Txt>

        {readingId && (
          <Pressable onPress={() => purchase("reading_unlock", readingId)} style={{ marginTop: 28, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20, flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyBold">{tr("unlockThis")}</Txt>
              <Txt variant="caption" style={{ marginTop: 4 }}>{alt("unlockThis")} · {tr("oneTime")}</Txt>
            </View>
            <Txt variant="bodyBold" style={{ fontSize: 22 }}>₹49</Txt>
          </Pressable>
        )}

        <View style={{ marginTop: 34, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gold, backgroundColor: "rgba(232,163,61,0.06)", padding: 20 }}>
          <View style={{ position: "absolute", top: -13, left: 20, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Txt variant="label" style={{ color: colors.onGold, fontSize: 10, fontWeight: "700" }}>{`${tr("mostPopular")} · ${alt("mostPopular").toUpperCase()}`}</Txt>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 6 }}>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyBold" style={{ fontSize: 20 }}>{tr("unlimited")}</Txt>
              <Txt variant="caption" style={{ marginTop: 4 }}>{alt("unlimited")} · {tr("unlimitedSub")}</Txt>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Txt variant="bodyBold" style={{ fontSize: 26 }}>₹99</Txt>
              <Txt variant="caption">{tr("perWeek")}</Txt>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
          <Txt variant="caption" style={{ fontSize: 14, color: colors.text55 }}>{tr("trialLine")} · {alt("trialLine")}</Txt>
          <Button label={tr("startTrial")} onPress={() => purchase("rashi_plus_weekly")} style={{ marginTop: 16 }} />
          <Txt variant="caption" style={{ textAlign: "center", marginTop: 14 }}>{tr("renews")}</Txt>
        </View>

        <Txt variant="caption" style={{ textAlign: "center", marginTop: 20, textDecorationLine: "underline", fontSize: 13 }} onPress={() => purchase("rashi_plus_yearly")}>
          {tr("yearly")}
        </Txt>
      </ScrollView>
    </Screen>
  );
}
