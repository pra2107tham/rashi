import { router } from "expo-router";
import { View } from "react-native";
import type { Period, Reading } from "../lib/api";
import { useT, type StringKey } from "../lib/i18n";
import { colors } from "../theme";
import { Icon } from "./Icon";
import { Txt } from "./Txt";
import { Card } from "./ui";

const LABEL: Record<Period, StringKey> = { today: "today", week: "thisWeek", month: "thisMonth" };

/**
 * One period card on Home. Locked cards show the headline and a blurred teaser
 * (text-shadow blur works on every Android version, unlike a native blur view).
 */
export function ReadingCard({ period, reading, loading, rashi }: { period: Period; reading?: Reading; loading?: boolean; rashi?: string }) {
  const { tr, alt } = useT();
  const today = period === "today";
  const locked = reading?.locked ?? !today;
  const open = () => {
    if (!reading) return;
    if (locked) router.push({ pathname: "/paywall", params: { period, readingId: reading.id } });
    else router.push(`/reading/${period}`);
  };
  return (
    <Card highlight={today} onPress={reading ? open : undefined} style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Txt variant="label" style={{ color: today ? colors.gold : colors.text45 }}>
          {`${tr(LABEL[period])} · ${alt(LABEL[period]).toUpperCase()}`}
        </Txt>
        {today && rashi ? <Txt variant="caption" style={{ fontSize: 13 }}>{rashi}</Txt> : null}
        {!today && locked && (
          <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,11,15,0.6)" }}>
            <Icon name="lock" size={16} color={colors.gold} />
          </View>
        )}
      </View>
      {loading && !reading ? (
        <Txt variant="caption">{tr("preparing")}</Txt>
      ) : reading ? (
        today ? (
          <>
            <Txt variant="prose" style={{ fontSize: 21, lineHeight: 29, color: colors.text }}>{reading.teaser}</Txt>
            <Txt
              variant="bodyBold"
              style={{ color: colors.gold, marginTop: 16, fontSize: 15 }}
              onPress={() => router.navigate("/match")}
            >
              {`${tr("matchKundli")} · ${alt("matchKundli")} →`}
            </Txt>
          </>
        ) : (
          <>
            <Txt variant="prose" style={{ color: colors.text }}>{reading.headline}</Txt>
            <Txt
              variant="prose"
              numberOfLines={3}
              style={locked ? { color: "transparent", textShadowColor: "rgba(245,243,239,0.55)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } } : { color: colors.text55, marginTop: 6 }}
            >
              {reading.teaser}
            </Txt>
          </>
        )
      ) : null}
    </Card>
  );
}
