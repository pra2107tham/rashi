import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Backdrop } from "../../components/Art";
import { Icon } from "../../components/Icon";
import { Txt } from "../../components/Txt";
import { api, errorCode, type ChatMessage, type ProfileResponse } from "../../lib/api";
import { useProfile } from "../../lib/hooks";
import { useT } from "../../lib/i18n";
import { keys } from "../../lib/query";
import { colors, fonts, radius, space } from "../../theme";

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const { tr, alt } = useT();
  const qc = useQueryClient();
  const profile = useProfile();
  const history = useQuery({ queryKey: keys.chat, queryFn: api.getChatHistory });
  const [text, setText] = useState("");
  const list = useRef<FlatList<ChatMessage>>(null);
  const credits = profile.data?.entitlements.chatCredits ?? 0;
  const subscribed = profile.data?.entitlements.subscribed ?? false;

  const send = useMutation({
    mutationFn: (q: string) => api.sendChatMessage(q),
    onMutate: (q) => {
      const optimistic: ChatMessage = { id: `local-${Date.now()}`, role: "user", content: q, createdAt: Date.now() };
      qc.setQueryData<ChatMessage[]>(keys.chat, (old = []) => [...old, optimistic]);
      setText("");
    },
    onSuccess: (res) => {
      qc.setQueryData<ChatMessage[]>(keys.chat, (old = []) => [...old, { id: res.messageId, role: "assistant", content: res.reply, createdAt: Date.now() }]);
      qc.setQueryData<ProfileResponse>(keys.profile, (old) => old && { ...old, entitlements: { ...old.entitlements, chatCredits: res.creditsRemaining } });
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: keys.chat });
      if (errorCode(e) === "resource-exhausted") router.push({ pathname: "/paywall", params: { reason: "chat" } });
    },
  });

  const ask = (q: string) => {
    const question = q.trim();
    if (!question || send.isPending) return;
    if (credits < 1 && !subscribed) {
      router.push({ pathname: "/paywall", params: { reason: "chat" } });
      return;
    }
    send.mutate(question);
  };

  const messages = history.data ?? [];
  const suggestions = [tr("askSuggest1"), tr("askSuggest2"), tr("askSuggest3")];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Backdrop diamondY={0.75} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ paddingTop: insets.top + space.md, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt variant="bodyBold" style={{ fontSize: 19 }}>{`${tr("askTitle")} · ${alt("askTitle")}`}</Txt>
          <View style={{ borderRadius: 14, backgroundColor: colors.goldTint, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Txt variant="bodyBold" style={{ color: colors.gold, fontSize: 14 }}>{subscribed ? "∞" : `${credits} ${tr("left")}`}</Txt>
          </View>
        </View>

        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 12, gap: 14 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Txt variant="subtitle" style={{ textAlign: "center", marginTop: 40 }}>{tr("askEmpty")}</Txt>
          }
          renderItem={({ item }) =>
            item.role === "user" ? (
              <View style={{ alignSelf: "flex-end", maxWidth: "82%", backgroundColor: colors.gold, borderRadius: radius.lg, borderBottomRightRadius: 6, paddingHorizontal: 18, paddingVertical: 12 }}>
                <Txt variant="bodyBold" style={{ color: colors.onGold, fontSize: 16 }}>{item.content}</Txt>
              </View>
            ) : (
              <View style={{ alignSelf: "flex-start", maxWidth: "90%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, borderBottomLeftRadius: 6, padding: 18 }}>
                <Txt variant="prose" style={{ fontSize: 18, lineHeight: 26 }}>{item.content}</Txt>
              </View>
            )
          }
          ListFooterComponent={
            <View style={{ gap: 10, marginTop: 6 }}>
              {send.isPending && <Txt variant="caption">{tr("thinking")}</Txt>}
              {messages.length < 4 && !send.isPending && suggestions.map((s) => (
                <Pressable key={s} onPress={() => ask(s)} style={{ alignSelf: "flex-start", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Txt style={{ color: colors.text90, fontSize: 14 }}>{s}</Txt>
                </Pressable>
              ))}
            </View>
          }
        />

        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 100, paddingTop: 8 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`${tr("askPlaceholder")} / ${alt("askPlaceholder")}`}
            placeholderTextColor={colors.text30}
            selectionColor={colors.gold}
            multiline
            maxLength={1000}
            style={{ flex: 1, minHeight: 56, maxHeight: 120, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, fontSize: 16, fontFamily: fonts.sans }}
          />
          <Pressable onPress={() => ask(text)} disabled={!text.trim() || send.isPending} style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", opacity: text.trim() ? 1 : 0.6 }}>
            <Icon name="send" size={22} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
