import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, space } from "../theme";
import { Backdrop } from "./Art";
import { Icon, type IconName } from "./Icon";
import { Txt } from "./Txt";

/** Full-bleed dark screen with the star backdrop, safe-area padding and an optional sticky footer. */
export function Screen({ children, footer, diamond = true, padded = true, diamondY }: {
  children: ReactNode; footer?: ReactNode; diamond?: boolean; padded?: boolean; diamondY?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Backdrop diamond={diamond} diamondY={diamondY} />
      <View style={{ flex: 1, paddingTop: insets.top + space.md, paddingHorizontal: padded ? space.lg : 0 }}>{children}</View>
      {footer && <View style={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.md, paddingTop: space.sm }}>{footer}</View>}
    </View>
  );
}

export function Button({ label, onPress, variant = "primary", disabled, loading, style, icon }: {
  label: string; onPress?: () => void; variant?: "primary" | "ghost"; disabled?: boolean; loading?: boolean; style?: ViewStyle; icon?: IconName;
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.ghost,
        (disabled || loading) && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onGold : colors.gold} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Txt variant="button" style={{ color: primary ? colors.onGold : colors.text }}>{label}</Txt>
          {icon && <Icon name={icon} size={18} />}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, size = 44 }: { name: IconName; onPress?: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.iconButton, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name={name} size={size * 0.42} color={colors.text90} />
    </Pressable>
  );
}

/** The 6-dash onboarding progress indicator. */
export function Progress({ step, total = 6 }: { step: number; total?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: space.lg }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: i < step ? colors.gold : colors.borderStrong }} />
      ))}
    </View>
  );
}

/** Big question in the user's language with the other language underneath, as in the design. */
export function Question({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ marginBottom: space.xl }}>
      <Txt variant="title">{title}</Txt>
      <Txt variant="subtitle" style={{ marginTop: 6 }}>{subtitle}</Txt>
    </View>
  );
}

export function Field({ label, error, children }: { label: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Txt variant="label" style={{ marginBottom: space.sm }}>{label}</Txt>
      {children}
      {!!error && <Txt variant="caption" style={{ color: colors.danger, marginTop: 8 }}>{error}</Txt>}
    </View>
  );
}

export function Input({ big, style, ...props }: TextInputProps & { big?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={colors.text30}
      selectionColor={colors.gold}
      cursorColor={colors.gold}
      {...props}
      style={[
        styles.input,
        big && { fontSize: 28, textAlign: "center", letterSpacing: 4, fontFamily: fonts.sansMedium, height: 72 },
        style,
      ]}
    />
  );
}

export function Card({ children, highlight, style, onPress }: { children: ReactNode; highlight?: boolean; style?: ViewStyle; onPress?: () => void }) {
  const body = (
    <View style={[styles.card, highlight && { borderColor: colors.gold, backgroundColor: colors.goldTint }, style]}>{children}</View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>{body}</Pressable> : body;
}

/** Selectable row with an icon tile, Hindi title and English subtitle (focus areas, role picker). */
export function OptionCard({ icon, title, subtitle, selected, onPress }: {
  icon: ReactNode; title: string; subtitle?: string; selected?: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && { borderColor: colors.gold, backgroundColor: colors.goldTint }]}>
      <View style={[styles.optionIcon, selected && { backgroundColor: colors.goldSoft }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Txt variant="bodyBold">{title}</Txt>
        {!!subtitle && <Txt variant="caption" style={{ fontSize: 14, marginTop: 2 }}>{subtitle}</Txt>}
      </View>
    </Pressable>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: space.xl }}>
      <ActivityIndicator color={colors.gold} />
      {!!label && <Txt variant="caption">{label}</Txt>}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  primary: { backgroundColor: colors.gold },
  ghost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  iconButton: { backgroundColor: colors.cardStrong, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  input: {
    height: 60, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    color: colors.text, paddingHorizontal: space.lg, fontSize: 18, fontFamily: fonts.sans,
    outlineWidth: 0,
  },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: space.lg },
  option: {
    flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, paddingVertical: 18,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginBottom: 12,
  },
  optionIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.cardStrong, alignItems: "center", justifyContent: "center" },
});
