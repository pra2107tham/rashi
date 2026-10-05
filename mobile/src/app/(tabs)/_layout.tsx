import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../components/Icon";
import { Txt } from "../../components/Txt";
import { useT, type StringKey } from "../../lib/i18n";
import { colors, radius } from "../../theme";

const TABS: Record<string, { icon: IconName; label: StringKey }> = {
  home: { icon: "home", label: "tabHome" },
  match: { icon: "heart", label: "tabMatch" },
  ask: { icon: "sparkle", label: "tabAsk" },
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { tr } = useT();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={({ state, navigation }) => (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
          <View style={{ flexDirection: "row", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(18,18,26,0.96)", paddingVertical: 12 }}>
            {state.routes.map((route, i) => {
              const tab = TABS[route.name];
              if (!tab) return null;
              const focused = state.index === i;
              const color = focused ? colors.gold : colors.text45;
              return (
                <Pressable key={route.key} onPress={() => navigation.navigate(route.name)} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  <Icon name={tab.icon} size={22} color={color} />
                  <Txt variant="caption" style={{ color, fontFamily: undefined, fontWeight: "600" }}>{tr(tab.label)}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="match" />
      <Tabs.Screen name="ask" />
    </Tabs>
  );
}
