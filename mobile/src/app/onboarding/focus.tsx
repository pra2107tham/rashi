import { router } from "expo-router";
import { ScrollView } from "react-native";
import { Icon } from "../../components/Icon";
import { Txt } from "../../components/Txt";
import { Button, OptionCard, Progress, Question, Screen } from "../../components/ui";
import { t, useT, type StringKey } from "../../lib/i18n";
import { useApp, type FocusArea } from "../../lib/store";
import { colors } from "../../theme";

const OPTIONS: { area: FocusArea; key: StringKey; icon: React.ReactNode }[] = [
  { area: "love", key: "focusLove", icon: <Icon name="heart" size={20} color={colors.gold} /> },
  { area: "career", key: "focusCareer", icon: <Icon name="home" size={20} color={colors.text55} /> },
  { area: "money", key: "focusMoney", icon: <Txt style={{ fontSize: 20, color: colors.text55 }}>₹</Txt> },
  { area: "health", key: "focusHealth", icon: <Icon name="health" size={20} color={colors.text55} /> },
  { area: "curious", key: "focusCurious", icon: <Icon name="sparkle" size={18} color={colors.text55} /> },
];

export default function FocusScreen() {
  const { tr, alt, both } = useT();
  const { draft, updateDraft } = useApp();
  return (
    <Screen diamond={false} footer={<Button label={both("continue")} disabled={!draft.focusArea} onPress={() => router.push("/onboarding/phone")} />}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Progress step={5} />
        <Question title={tr("focusTitle")} subtitle={alt("focusTitle")} />
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.area}
            icon={o.icon}
            title={t(o.key, "hi")}
            subtitle={t(o.key, "en")}
            selected={draft.focusArea === o.area}
            onPress={() => updateDraft({ focusArea: o.area })}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
