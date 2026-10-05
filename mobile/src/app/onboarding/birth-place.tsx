import { router } from "expo-router";
import { ScrollView } from "react-native";
import { PlaceSearch } from "../../components/PlaceSearch";
import { Button, Field, Progress, Question, Screen } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { useApp } from "../../lib/store";

export default function BirthPlaceScreen() {
  const { tr, alt, both } = useT();
  const { draft, updateDraft } = useApp();
  return (
    <Screen diamond={false} footer={<Button label={both("continue")} disabled={!draft.place} onPress={() => router.push("/onboarding/focus")} />}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Progress step={4} />
        <Question title={tr("pobTitle")} subtitle={alt("pobTitle")} />
        <Field label={tr("pobLabel")}>
          <PlaceSearch value={draft.place} onSelect={(place) => updateDraft({ place })} autoFocus />
        </Field>
      </ScrollView>
    </Screen>
  );
}
