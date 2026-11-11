import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Txt } from "../components/Txt";
import { Button } from "../components/ui";
import { ensureSignedIn } from "../lib/firebase";
import { keepPushTokenFresh } from "../lib/push";
import { persister, queryClient } from "../lib/query";
import { useApp } from "../lib/store";
import { colors } from "../theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // Only the seven faces the design uses (the packages' index files would bundle every weight).
  const [fontsLoaded] = useFonts({
    Cormorant_600SemiBold: require("@expo-google-fonts/cormorant/600SemiBold/Cormorant_600SemiBold.ttf"),
    WorkSans_400Regular: require("@expo-google-fonts/work-sans/400Regular/WorkSans_400Regular.ttf"),
    WorkSans_500Medium: require("@expo-google-fonts/work-sans/500Medium/WorkSans_500Medium.ttf"),
    WorkSans_600SemiBold: require("@expo-google-fonts/work-sans/600SemiBold/WorkSans_600SemiBold.ttf"),
    HindVadodara_400Regular: require("@expo-google-fonts/hind-vadodara/400Regular/HindVadodara_400Regular.ttf"),
    HindVadodara_600SemiBold: require("@expo-google-fonts/hind-vadodara/600SemiBold/HindVadodara_600SemiBold.ttf"),
    HindVadodara_700Bold: require("@expo-google-fonts/hind-vadodara/700Bold/HindVadodara_700Bold.ttf"),
  });
  const [authState, setAuthState] = useState<"pending" | "ready" | "error">("pending");
  const profileSaved = useApp((s) => s.profileSaved);

  const startSignIn = () =>
    ensureSignedIn().then(() => setAuthState("ready")).catch(() => setAuthState("error"));
  const retrySignIn = () => {
    setAuthState("pending");
    startSignIn();
  };
  useEffect(() => {
    startSignIn();
  }, []);
  useEffect(() => (profileSaved ? keepPushTokenFresh() : undefined), [profileSaved]);

  const ready = fontsLoaded && authState !== "pending";
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 7 * 24 * 60 * 60_000 }}>
          <StatusBar style="light" />
          {authState === "error" ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16, backgroundColor: colors.bg }}>
              <Txt variant="heading" style={{ textAlign: "center" }}>{"Can't reach Rashi · कनेक्शन नहीं हो पाया"}</Txt>
              <Txt style={{ textAlign: "center" }}>Check your internet connection and try again.</Txt>
              <Button label="Try again · फिर कोशिश करें" onPress={retrySignIn} />
            </View>
          ) : (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "fade" }}>
              <Stack.Screen name="paywall" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
            </Stack>
          )}
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
