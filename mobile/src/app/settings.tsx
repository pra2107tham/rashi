import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, View } from "react-native";
import Constants from "expo-constants";
import { Txt } from "../components/Txt";
import { Card, IconButton, Screen } from "../components/ui";
import { api } from "../lib/api";
import { signOut } from "../lib/firebase";
import { useProfile } from "../lib/hooks";
import { t, useT } from "../lib/i18n";
import { registerForPush } from "../lib/push";
import { storage } from "../lib/storage";
import { useApp, type Language } from "../lib/store";
import { colors, radius } from "../theme";

export default function SettingsScreen() {
  const { tr, lang } = useT();
  const qc = useQueryClient();
  const profile = useProfile();
  const setLanguage = useApp((s) => s.setLanguage);
  const reset = useApp((s) => s.reset);
  const [push, setPush] = useState(true);

  const changeLanguage = async (l: Language) => {
    if (l === lang || !profile.data) return;
    setLanguage(l);
    const p = profile.data.profile;
    // Readings are generated per language, so the profile is re-saved and the cache dropped.
    await api.upsertProfile({ name: p.name, birthDate: p.birthDate, birthTime: p.birthTime, placeName: p.placeName, lat: p.lat, lng: p.lng, focusArea: p.focusArea, language: l });
    qc.invalidateQueries();
  };

  const togglePush = async (on: boolean) => {
    setPush(on);
    if (on) await registerForPush();
    await api.updateNotificationPrefs(on).catch(() => setPush(!on));
  };

  const deleteAccount = () => {
    Alert.alert(t("deleteAccount", lang), t("deleteConfirm", lang), [
      { text: t("cancel", lang), style: "cancel" },
      {
        text: t("delete", lang),
        style: "destructive",
        onPress: async () => {
          await api.deleteAccount();
          await signOut();
          qc.clear();
          storage.clearAll();
          reset();
          router.replace("/onboarding/language");
        },
      },
    ]);
  };

  return (
    <Screen diamond={false}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <IconButton name="back" onPress={() => router.back()} />
        <Txt variant="title" style={{ fontSize: 28 }}>{tr("settings")}</Txt>
      </View>
      <ScrollView>
        {profile.data && (
          <Card style={{ marginBottom: 16 }}>
            <Txt variant="heading">{profile.data.profile.name}</Txt>
            <Txt style={{ marginTop: 6 }}>
              {`${profile.data.profile.chart.rashi.hindi} · ${profile.data.profile.chart.rashi.english} — ${profile.data.profile.chart.nakshatra.name}`}
            </Txt>
            <Txt variant="caption" style={{ marginTop: 4 }}>{`${profile.data.profile.birthDate} · ${profile.data.profile.placeName}`}</Txt>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }}>
          <Txt variant="label" style={{ marginBottom: 12 }}>{tr("language")}</Txt>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {(["hi", "en"] as const).map((l) => (
              <Pressable key={l} onPress={() => changeLanguage(l)} style={{ flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: lang === l ? colors.gold : colors.border, backgroundColor: lang === l ? colors.goldTint : "transparent" }}>
                <Txt variant="bodyBold" style={{ color: lang === l ? colors.gold : colors.text }}>{l === "hi" ? "हिंदी" : "English"}</Txt>
              </Pressable>
            ))}
          </View>
        </Card>
        <Card style={{ marginBottom: 16, flexDirection: "row", alignItems: "center" }}>
          <Txt variant="bodyBold" style={{ flex: 1, fontSize: 16 }}>{tr("dailyPush")}</Txt>
          <Switch value={push} onValueChange={togglePush} trackColor={{ true: colors.gold, false: colors.borderStrong }} thumbColor={colors.text} />
        </Card>
        <Pressable onPress={deleteAccount} style={{ padding: 16 }}>
          <Txt style={{ color: colors.danger }}>{tr("deleteAccount")}</Txt>
        </Pressable>
        <Txt variant="caption" style={{ padding: 16 }}>Rashi v{Constants.expoConfig?.version ?? "1.0.0"}</Txt>
      </ScrollView>
    </Screen>
  );
}
