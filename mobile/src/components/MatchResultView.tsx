import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import type { MatchResult } from "../lib/api";
import { useProfile } from "../lib/hooks";
import { useT, type StringKey } from "../lib/i18n";
import { colors, radius, space } from "../theme";
import { Backdrop, Constellation } from "./Art";
import { Icon } from "./Icon";
import { Txt } from "./Txt";
import { Button, Card } from "./ui";

const KOOTAS: [keyof MatchResult["scores"], string, number][] = [
  ["varna", "Varna", 1], ["vashya", "Vashya", 2], ["tara", "Tara", 3], ["yoni", "Yoni", 4],
  ["grahaMaitri", "Graha Maitri", 5], ["gana", "Gana", 6], ["bhakoot", "Bhakoot", 7], ["nadi", "Nadi", 8],
];

function verdict(total: number): StringKey {
  if (total >= 33) return "matchExcellent";
  if (total >= 25) return "matchStrong";
  if (total >= 18) return "matchOk";
  return "matchWeak";
}

function Avatar({ name, highlight }: { name: string; highlight?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: highlight ? colors.gold : colors.borderStrong, backgroundColor: highlight ? colors.goldTint : colors.card, alignItems: "center", justifyContent: "center" }}>
        <Constellation size={30} color={highlight ? colors.gold : colors.text90} />
      </View>
      <Txt variant="bodyBold" style={{ fontSize: 14, color: colors.text55 }}>{name}</Txt>
    </View>
  );
}

/** Score card + koota bars + narrative, and a share image for WhatsApp. */
export function MatchResultView({ result, onNew }: { result: MatchResult; onNew: () => void }) {
  const insets = useSafeAreaInsets();
  const { tr, alt } = useT();
  const me = useProfile().data?.profile.name ?? "";
  const shot = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const { scores, doshas, narrative } = result;
  const v = verdict(scores.total);
  const m = doshas.manglik;
  const mangal: StringKey = m.you.isManglik && m.them.isManglik ? "mangalBoth" : m.you.isManglik || m.them.isManglik ? "mangalOne" : "mangalNone";
  const mangalOk = mangal !== "mangalOne";

  const share = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(shot, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: tr("shareWhatsApp") });
    } finally {
      setSharing(false);
    }
  };

  const scoreCard = (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.goldTint, paddingVertical: 26, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Txt style={{ fontFamily: "WorkSans_600SemiBold", fontSize: 60, lineHeight: 66, color: colors.text }}>{String(scores.total)}</Txt>
        <Txt variant="heading" style={{ color: colors.text55, marginBottom: 8 }}>/36</Txt>
      </View>
      <Txt variant="bodyBold" style={{ color: colors.gold, fontSize: 16, marginTop: 4 }}>{`${tr(v)} · ${alt(v)}`}</Txt>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Backdrop diamondY={0.14} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: 20, paddingBottom: insets.bottom + 130 }}>
        <Txt variant="bodyBold" style={{ textAlign: "center", fontSize: 16 }}>{`${tr("matchTitle")} · ${alt("matchTitle")}`}</Txt>
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 28, marginVertical: 22 }}>
          <Avatar name={me} highlight />
          <Icon name="sparkle" size={16} color={colors.text30} />
          <Avatar name={result.otherName} />
        </View>

        {scoreCard}

        <Card style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: mangalOk ? "rgba(63,178,127,0.18)" : "rgba(229,103,90,0.18)" }}>
            <Icon name={mangalOk ? "check" : "close"} size={15} color={mangalOk ? colors.success : colors.danger} />
          </View>
          <Txt style={{ flex: 1, color: colors.text90, fontSize: 14 }}>{`${tr(mangal)} · ${alt(mangal)}`}</Txt>
        </Card>

        <View style={{ marginTop: 22, gap: 14 }}>
          {KOOTAS.map(([k, label, max]) => (
            <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Txt style={{ width: 104, color: colors.text55, fontSize: 14 }}>{label}</Txt>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.cardStrong }}>
                <View style={{ width: `${(scores[k] / max) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.gold }} />
              </View>
              <Txt style={{ width: 40, textAlign: "right", color: colors.text55, fontSize: 14 }}>{`${scores[k]}/${max}`}</Txt>
            </View>
          ))}
        </View>

        <Card style={{ marginTop: 26 }}>
          <Txt variant="heading" style={{ marginBottom: 8 }}>{narrative.headline}</Txt>
          <Txt variant="prose" style={{ fontSize: 17, lineHeight: 26 }}>{narrative.summary}</Txt>
          {narrative.strengths.length > 0 && <Txt variant="label" style={{ marginTop: 18, color: colors.gold }}>{tr("strengths")}</Txt>}
          {narrative.strengths.map((s, i) => <Txt key={i} style={{ marginTop: 8, color: colors.text90 }}>+ {s}</Txt>)}
          {narrative.cautions.length > 0 && <Txt variant="label" style={{ marginTop: 18 }}>{tr("cautions")}</Txt>}
          {narrative.cautions.map((s, i) => <Txt key={i} style={{ marginTop: 8, color: colors.text90 }}>− {s}</Txt>)}
          <Txt style={{ marginTop: 18, color: colors.text55 }}>{narrative.doshaNote}</Txt>
        </Card>

        <Button label={`${tr("shareWhatsApp")} ↗`} loading={sharing} onPress={share} style={{ marginTop: 22 }} />
        <Button variant="ghost" label={tr("newMatch")} onPress={onNew} style={{ marginTop: 12 }} />
      </ScrollView>

      {/* Off-screen share card captured as an image for WhatsApp Status. */}
      <View style={{ position: "absolute", left: -10000, top: 0 }} pointerEvents="none">
        <View ref={shot} collapsable={false}>
          <View style={{ width: 360, height: 640, backgroundColor: colors.bg, padding: 28, justifyContent: "center" }}>
            <Backdrop diamondY={0.5} seed={3} />
            <View style={{ alignItems: "center", marginBottom: 26 }}>
              <Constellation size={40} />
              <Txt variant="title" style={{ marginTop: 10 }}>{`${me} + ${result.otherName}`}</Txt>
            </View>
            {scoreCard}
            <Txt variant="prose" style={{ textAlign: "center", marginTop: 24 }}>{narrative.shareLine}</Txt>
            <Txt variant="label" style={{ textAlign: "center", marginTop: 40 }}>Rashi · वैदिक ज्योतिष</Txt>
          </View>
        </View>
      </View>
    </View>
  );
}
