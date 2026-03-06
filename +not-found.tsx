import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { AlertCircle } from "lucide-react-native";

export default function NotFoundScreen() {
  const { colors, fontSizes } = useAccessibility();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Page Not Found",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textOnPrimary,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.errorLight }]}>
          <AlertCircle size={48} color={colors.error} strokeWidth={2} />
        </View>
        <Text style={[styles.title, { color: colors.text, fontSize: fontSizes.xl }]}>
          This screen doesn&apos;t exist.
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
          The page you&apos;re looking for couldn&apos;t be found.
        </Text>

        <Link href="/home" style={[styles.link, { backgroundColor: colors.primary }]}>
          <Text style={[styles.linkText, { color: colors.textOnPrimary, fontSize: fontSizes.lg }]}>
            Go to Home
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center" as const,
    marginBottom: 32,
  },
  link: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  linkText: {
    fontWeight: "600" as const,
  },
});
