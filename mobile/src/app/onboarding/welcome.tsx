import { router } from "expo-router";
import { View } from "react-native";
import { Constellation } from "../../components/Art";
import { Txt } from "../../components/Txt";
import { Button, Screen } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { colors } from "../../theme";

export default function WelcomeScreen() {
  const { tr, alt } = useT();
  return (
    <Screen diamondY={0.4} footer={<Button label={tr("getStarted")} onPress={() => router.push("/onboarding/name")} />}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: colors.goldLine, alignItems: "center", justifyContent: "center" }}>
          <Constellation size={60} />
        </View>
        <Txt variant="display" style={{ textAlign: "center", marginTop: 36 }}>{tr("welcomeTitle")}</Txt>
        <Txt style={{ textAlign: "center", marginTop: 18, fontSize: 16, paddingHorizontal: 24 }}>{tr("welcomeBody")}</Txt>
        <Txt variant="caption" style={{ textAlign: "center", marginTop: 8, color: colors.text30 }}>{alt("welcomeTitle")}</Txt>
      </View>
    </Screen>
  );
}
