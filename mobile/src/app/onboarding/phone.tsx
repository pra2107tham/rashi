import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Txt } from "../../components/Txt";
import { Button, Field, Input, Progress, Question, Screen } from "../../components/ui";
import { sendPhoneCode } from "../../lib/firebase";
import { useT } from "../../lib/i18n";
import { colors, radius } from "../../theme";

export default function PhoneScreen() {
  const { tr, alt, both } = useT();
  const [digits, setDigits] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^[6-9]\d{9}$/.test(digits);

  const send = async () => {
    setSending(true);
    setError(null);
    const phone = `+91${digits}`;
    try {
      const v = await sendPhoneCode(phone);
      router.push({ pathname: "/onboarding/otp", params: { phone, verificationId: v.verificationId, autoCode: v.autoCode ?? "" } });
    } catch (e) {
      setError(`${tr("somethingWrong")} (${(e as { code?: string }).code ?? "unknown"})`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen diamond={false} footer={<Button label={both("sendCode")} disabled={!valid} loading={sending} onPress={send} />}>
      <Progress step={6} />
      <Question title={tr("phoneTitle")} subtitle={alt("phoneTitle")} />
      <Field label={tr("phoneLabel")} error={error}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ height: 60, paddingHorizontal: 18, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: "center" }}>
            <Txt variant="bodyBold" style={{ fontSize: 18 }}>+91</Txt>
          </View>
          <Input style={{ flex: 1, letterSpacing: 2 }} value={digits} onChangeText={(t) => setDigits(t.replace(/\D/g, "").slice(0, 10))} placeholder="98765 43210" keyboardType="phone-pad" autoFocus />
        </View>
      </Field>
      <Txt variant="caption" style={{ fontSize: 13 }}>{tr("phoneBody")}</Txt>
    </Screen>
  );
}
