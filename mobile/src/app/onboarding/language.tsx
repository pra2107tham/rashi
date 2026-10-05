import { router } from "expo-router";
import { View } from "react-native";
import { Constellation } from "../../components/Art";
import { Txt } from "../../components/Txt";
import { Button, Screen } from "../../components/ui";
import { useApp, type Language } from "../../lib/store";
import { colors } from "../../theme";

export default function LanguageScreen() {
  const setLanguage = useApp((s) => s.setLanguage);
  const choose = (l: Language) => {
    setLanguage(l);
    router.push("/onboarding/welcome");
  };
  return (
    <Screen diamondY={0.45}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 60 }}>
        <Constellation size={56} />
        <Txt variant="display" style={{ fontSize: 46, marginTop: 18 }}>Rashi</Txt>
        <Txt variant="label" style={{ marginTop: 10, color: colors.text45 }}>वैदिक ज्योतिष · VEDIC ASTROLOGY</Txt>
        <View style={{ alignSelf: "stretch", gap: 14, marginTop: 56, paddingHorizontal: 16 }}>
          <Button variant="ghost" label="हिंदी" onPress={() => choose("hi")} />
          <Button variant="ghost" label="English" onPress={() => choose("en")} />
        </View>
      </View>
    </Screen>
  );
}
