import { router } from "expo-router";
import { useState } from "react";
import { Button, Field, Input, Progress, Question, Screen } from "../../components/ui";
import { formatDate, maskDate, parseDate } from "../../lib/dates";
import { useT } from "../../lib/i18n";
import { useApp } from "../../lib/store";

export default function BirthDateScreen() {
  const { tr, alt, both } = useT();
  const { draft, updateDraft } = useApp();
  const [value, setValue] = useState(draft.birthDate ? formatDate(draft.birthDate) : "");
  const iso = parseDate(value);
  const complete = value.replace(/\D/g, "").length === 8;
  const next = () => {
    if (!iso) return;
    updateDraft({ birthDate: iso });
    router.push("/onboarding/birth-time");
  };
  return (
    <Screen diamond={false} footer={<Button label={both("continue")} disabled={!iso} onPress={next} />}>
      <Progress step={2} />
      <Question title={tr("dobTitle")} subtitle={alt("dobTitle")} />
      <Field label={tr("dobLabel")} error={complete && !iso ? tr("dobInvalid") : null}>
        <Input big value={value} onChangeText={(t) => setValue(maskDate(t))} placeholder="DD / MM / YYYY" keyboardType="number-pad" autoFocus maxLength={14} />
      </Field>
    </Screen>
  );
}
