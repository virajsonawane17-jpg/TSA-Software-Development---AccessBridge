import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { ScannedTextProvider } from "@/contexts/ScannedTextContext";
import { UserProvider } from "@/contexts/UserContext";
import { HistoryProvider } from "@/contexts/HistoryContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerBackTitleStyle: { fontSize: 18 },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
      <Stack.Screen name="setup" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="scan-text" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="text-result" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="read-screen" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="object-detection" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="navigation-help" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="settings" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="ai-guider" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="history" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="analytics" options={{ headerShown: true, headerShadowVisible: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AccessibilityProvider>
            <UserProvider>
              <HistoryProvider>
                <ScannedTextProvider>
                  <RootLayoutNav />
                </ScannedTextProvider>
              </HistoryProvider>
            </UserProvider>
          </AccessibilityProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
