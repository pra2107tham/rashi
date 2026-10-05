import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Button, Field, Input, Progress, Question, Screen } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { useApp } from "../../lib/store";

export default function NameScreen() {
  const { tr, alt, both } = useT();
  const { draft, updateDraft } = useApp();
  const [name, setName] = useState(draft.name);
  const valid = name.trim().length >= 1;
  const next = () => {
    updateDraft({ name: name.trim() });
    router.push("/onboarding/birth-date");
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen diamond={false} footer={<Button label={both("continue")} disabled={!valid} onPress={next} />}>
        <Progress step={1} />
        <Question title={tr("nameTitle")} subtitle={alt("nameTitle")} />
        <Field label={tr("namePlaceholder")}>
          <Input value={name} onChangeText={setName} placeholder={tr("namePlaceholder")} autoFocus autoCapitalize="words" maxLength={60} returnKeyType="next" onSubmitEditing={() => valid && next()} />
        </Field>
      </Screen>
    </KeyboardAvoidingView>
  );
}
