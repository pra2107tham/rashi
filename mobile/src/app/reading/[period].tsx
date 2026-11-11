import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { Txt } from "../../components/Txt";
import { Card, IconButton, Loading, Screen } from "../../components/ui";
import type { Period } from "../../lib/api";
import { useReading } from "../../lib/hooks";
import { useT } from "../../lib/i18n";
import { colors } from "../../theme";

export default function ReadingScreen() {
  const { period } = useLocalSearchParams<{ period: Period }>();
  const { tr } = useT();
  const { data, isLoading } = useReading(period);
  const content = data?.content;

  return (
    <Screen diamond={false}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
        <IconButton name="back" onPress={() => router.back()} />
      </View>
      {isLoading && <Loading label={tr("preparing")} />}
      {content && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Txt variant="label" style={{ color: colors.gold }}>{content.mood}</Txt>
          <Txt variant="title" style={{ marginTop: 8, marginBottom: 12 }}>{content.headline}</Txt>
          <Txt variant="prose" style={{ marginBottom: 24 }}>{content.teaser}</Txt>
          {content.sections.map((s, i) => (
            <Card key={i} style={{ marginBottom: 14 }}>
              <Txt variant="heading" style={{ marginBottom: 8 }}>{s.title}</Txt>
              <Txt variant="prose" style={{ fontSize: 18, lineHeight: 27 }}>{s.body}</Txt>
            </Card>
          ))}
          <Card highlight style={{ marginTop: 6 }}>
            <Txt variant="label" style={{ color: colors.gold, marginBottom: 12 }}>{tr("lucky")}</Txt>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {[
                [tr("luckyColor"), content.lucky.color],
                [tr("luckyNumber"), String(content.lucky.number)],
                [tr("luckyTime"), content.lucky.time],
              ].map(([k, v]) => (
                <View key={k} style={{ flex: 1 }}>
                  <Txt variant="caption">{k}</Txt>
                  <Txt variant="bodyBold" style={{ fontSize: 16, marginTop: 4 }}>{v}</Txt>
                </View>
              ))}
            </View>
            <Txt variant="caption" style={{ marginTop: 18 }}>{tr("remedy")}</Txt>
            <Txt style={{ color: colors.text90, marginTop: 4 }}>{content.remedy}</Txt>
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}
