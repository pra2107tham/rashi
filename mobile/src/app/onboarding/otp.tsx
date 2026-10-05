import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable } from "react-native";
import { Txt } from "../../components/Txt";
import { Button, Field, Input, Question, Screen } from "../../components/ui";
import { confirmPhoneCode, sendPhoneCode } from "../../lib/firebase";
import { useT } from "../../lib/i18n";
import { saveProfileFromDraft } from "../../lib/onboarding";
import { colors } from "../../theme";

export default function OtpScreen() {
  const { tr, alt, both } = useT();
  const params = useLocalSearchParams<{ phone: string; verificationId: string; autoCode?: string }>();
  const [verificationId, setVerificationId] = useState(params.verificationId);
  const [code, setCode] = useState(params.autoCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  const verify = async (value = code) => {
    setBusy(true);
    setError(null);
    try {
      await confirmPhoneCode(verificationId, value);
      await saveProfileFromDraft();
      router.replace("/onboarding/reveal");
    } catch (e) {
      setError(`${tr("somethingWrong")} (${(e as { code?: string }).code ?? "unknown"})`);
      setBusy(false);
    }
  };

  // Android may read the SMS itself; then verify straight away.
  useEffect(() => {
    if (params.autoCode && !autoSubmitted.current) {
      autoSubmitted.current = true;
      verify(params.autoCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resend = async () => {
    setError(null);
    try {
      const v = await sendPhoneCode(params.phone, true);
      setVerificationId(v.verificationId);
    } catch (e) {
      setError(`${tr("somethingWrong")} (${(e as { code?: string }).code ?? "unknown"})`);
    }
  };

  return (
    <Screen diamond={false} footer={<Button label={both("verify")} disabled={code.length !== 6} loading={busy} onPress={() => verify()} />}>
      <Question title={tr("otpTitle")} subtitle={alt("otpTitle")} />
      <Txt style={{ marginTop: -16, marginBottom: 24 }}>{tr("otpBody")} {params.phone}</Txt>
      <Field label="OTP" error={error}>
        <Input big value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" keyboardType="number-pad" autoFocus textContentType="oneTimeCode" autoComplete="sms-otp" />
      </Field>
      <Pressable onPress={resend} hitSlop={8}>
        <Txt style={{ color: colors.gold }}>{tr("resend")}</Txt>
      </Pressable>
    </Screen>
  );
}
