import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../src/constants';
import { useGardenStore } from '../src/store/gardenStore';
import { useAuthStore } from '../src/store/authStore';
import {
  registerForPushNotifications,
  setupNotificationActions,
} from '../src/services/notifications';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const { user, isInitialized, initialize } = useAuthStore();
  const loadGardens = useGardenStore((s) => s.loadGardens);
  const router = useRouter();
  const segments = useSegments();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // Set up push notification actions & handle taps
  useEffect(() => {
    setupNotificationActions();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.plantId) {
        router.push(`/plant/${data.plantId}`);
      }
    });

    return () => subscription.remove();
  }, []);

  // Auth-based routing
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, isInitialized, segments]);

  // Load data once authenticated
  useEffect(() => {
    if (user) {
      loadGardens();
      registerForPushNotifications();
    }
  }, [user]);

  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.textLight,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plant/[id]" options={{ title: 'Plant Details' }} />
        <Stack.Screen name="add-plant" options={{ title: 'Add Plant', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
