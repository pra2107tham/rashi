import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import type { Place } from "../lib/store";
import { colors, radius } from "../theme";
import { Txt } from "./Txt";
import { Input } from "./ui";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** City autocomplete backed by the searchPlaces function. */
export function PlaceSearch({ value, onSelect, autoFocus }: { value: Place | null; onSelect: (p: Place) => void; autoFocus?: boolean }) {
  const { tr } = useT();
  const [query, setQuery] = useState(value ? value.name : "");
  const debounced = useDebounced(query.trim(), 250);
  const picked = value && query === value.name;
  const { data, isFetching } = useQuery({
    queryKey: ["places", debounced],
    queryFn: () => api.searchPlaces(debounced),
    enabled: debounced.length >= 2 && !picked,
    staleTime: Infinity,
  });

  return (
    <View>
      <View>
        <Input value={query} onChangeText={setQuery} placeholder={tr("pobPlaceholder")} autoFocus={autoFocus} autoCorrect={false} />
        {isFetching && <ActivityIndicator color={colors.gold} style={{ position: "absolute", right: 18, top: 20 }} />}
      </View>
      {picked && (
        <Txt variant="caption" style={{ marginTop: 8, color: colors.gold }}>✓ {value.name}, {value.region}</Txt>
      )}
      {!picked && debounced.length >= 2 && data && (
        <View style={{ marginTop: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: "hidden" }}>
          {data.length === 0 && <Txt variant="caption" style={{ padding: 16 }}>{tr("pobEmpty")}</Txt>}
          {data.map((p, i) => (
            <Pressable
              key={`${p.name}-${p.lat}-${p.lng}`}
              onPress={() => {
                setQuery(p.name);
                onSelect(p);
              }}
              style={({ pressed }) => [{ paddingVertical: 14, paddingHorizontal: 18, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }, pressed && { backgroundColor: colors.goldTint }]}
            >
              <Txt variant="bodyBold" style={{ fontSize: 16 }}>{p.name}</Txt>
              <Txt variant="caption">{p.region}{p.country !== "IN" ? "" : ", India"}</Txt>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
