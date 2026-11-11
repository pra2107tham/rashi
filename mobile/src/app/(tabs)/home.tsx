import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Backdrop, Constellation } from "../../components/Art";
import { ReadingCard } from "../../components/ReadingCard";
import { Txt } from "../../components/Txt";
import { useProfile, useReading } from "../../lib/hooks";
import { useT } from "../../lib/i18n";
import { useApp } from "../../lib/store";
import { colors, space } from "../../theme";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { tr, lang } = useT();
  const draftName = useApp((s) => s.draft.name);
  const profile = useProfile();
  const today = useReading("today");
  const week = useReading("week");
  const month = useReading("month");
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const chart = profile.data?.profile.chart;
  const rashi = chart ? (lang === "hi" ? `${chart.rashi.hindi} · ${chart.rashi.english}` : `${chart.rashi.english} · ${chart.rashi.hindi}`) : undefined;
  const name = profile.data?.profile.name ?? draftName;

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Backdrop diamondY={0.12} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} colors={[colors.gold]} />}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <View>
            <Txt variant="caption" style={{ fontSize: 13 }}>{tr("greeting")}</Txt>
            <Txt variant="title" style={{ fontSize: 30 }}>{name}</Txt>
          </View>
          <Pressable onPress={() => router.push("/settings")} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Constellation size={30} />
          </Pressable>
        </View>
        <ReadingCard period="today" reading={today.data} loading={today.isLoading} rashi={rashi} />
        <ReadingCard period="week" reading={week.data} loading={week.isLoading} />
        <ReadingCard period="month" reading={month.data} loading={month.isLoading} />
        {(today.isError && !today.data) && (
          <Txt variant="caption" style={{ textAlign: "center", marginTop: 8 }} onPress={() => today.refetch()}>{tr("somethingWrong")} · {tr("retry")}</Txt>
        )}
      </ScrollView>
    </View>
  );
}
