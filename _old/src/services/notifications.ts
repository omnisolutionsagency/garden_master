import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Plant, WateringSchedule, AiRecommendation } from '../types';
import dayjs from 'dayjs';

// ============================================================
// CONFIGURATION
// ============================================================

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
  }),
});

// ============================================================
// PERMISSIONS & REGISTRATION
// ============================================================

/**
 * Request notification permissions and get push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('watering', {
      name: 'Watering Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5B9BD5',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('fertilizer', {
      name: 'Fertilizer Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#8B6914',
    });

    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Garden Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#C44B4B',
      sound: 'default',
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: undefined, // Uses app.json config
  });

  // Store token in Supabase for server-side push later
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('push_tokens').upsert({
      user_id: user.id,
      token: tokenData.data,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }

  return tokenData.data;
}

// ============================================================
// SCHEDULE WATERING NOTIFICATIONS
// ============================================================

/**
 * Schedule daily watering reminders for all plants based on their schedules
 */
export async function scheduleWateringNotifications(
  plants: Plant[],
  schedules: Record<string, WateringSchedule>,
  recommendations: Record<string, AiRecommendation>
): Promise<number> {
  // Clear existing watering notifications first
  await cancelNotificationsByCategory('watering');

  let scheduledCount = 0;

  for (const plant of plants) {
    const schedule = schedules[plant.id];
    const rec = recommendations[plant.id];
    if (!schedule?.is_active) continue;

    const amount = rec?.watering?.amount_gallons || schedule.amount_gallons || 0;
    const frequencyDays = rec?.watering?.frequency_days || schedule.frequency_days || 1;

    // Parse preferred time (HH:MM format)
    const [hours, minutes] = (schedule.preferred_time || '07:00').split(':').map(Number);

    // Schedule notifications for the next 14 days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      if (dayOffset % frequencyDays !== 0) continue;

      const triggerDate = dayjs()
        .add(dayOffset, 'day')
        .hour(hours)
        .minute(minutes)
        .second(0);

      // Skip if trigger time is in the past
      if (triggerDate.isBefore(dayjs())) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💧 Water ${plant.name}`,
          body: `${amount} gallons${plant.quantity > 1 ? ` each (×${plant.quantity})` : ''}${rec?.watering?.adjustments?.[0] ? ` — ${rec.watering.adjustments[0]}` : ''}`,
          data: {
            type: 'watering',
            plantId: plant.id,
            plantName: plant.name,
            amount,
          },
          categoryIdentifier: 'watering',
          ...(Platform.OS === 'android' && { channelId: 'watering' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate.toDate(),
        },
      });

      scheduledCount++;
    }
  }

  return scheduledCount;
}

// ============================================================
// SCHEDULE FERTILIZER NOTIFICATIONS
// ============================================================

/**
 * Schedule fertilizer reminders based on AI recommendations
 */
export async function scheduleFertilizerNotifications(
  plants: Plant[],
  recommendations: Record<string, AiRecommendation>
): Promise<number> {
  await cancelNotificationsByCategory('fertilizer');

  let scheduledCount = 0;

  for (const plant of plants) {
    const rec = recommendations[plant.id];
    if (!rec?.fertilizer) continue;

    // Parse frequency string like "every 2 weeks", "weekly", "monthly"
    const freqDays = parseFertilizerFrequency(rec.fertilizer.frequency);
    if (freqDays <= 0) continue;

    // Schedule at 9 AM
    for (let dayOffset = freqDays; dayOffset <= 60; dayOffset += freqDays) {
      const triggerDate = dayjs().add(dayOffset, 'day').hour(9).minute(0).second(0);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🌱 Fertilize ${plant.name}`,
          body: `${rec.fertilizer.type} (${rec.fertilizer.npk_ratio}) — ${rec.fertilizer.amount}`,
          data: {
            type: 'fertilizer',
            plantId: plant.id,
            plantName: plant.name,
          },
          categoryIdentifier: 'fertilizer',
          ...(Platform.OS === 'android' && { channelId: 'fertilizer' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate.toDate(),
        },
      });

      scheduledCount++;
    }
  }

  return scheduledCount;
}

// ============================================================
// WEATHER ALERT NOTIFICATIONS
// ============================================================

/**
 * Schedule an immediate weather alert notification
 */
export async function sendWeatherAlert(
  alertType: 'frost' | 'heat' | 'heavy_rain' | 'drought',
  message: string
): Promise<void> {
  const titles: Record<string, string> = {
    frost: '🥶 Frost Warning',
    heat: '🔥 Heat Alert',
    heavy_rain: '🌧️ Heavy Rain Expected',
    drought: '☀️ Drought Alert',
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titles[alertType] || '⚠️ Garden Alert',
      body: message,
      data: { type: 'weather_alert', alertType },
      categoryIdentifier: 'alerts',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === 'android' && { channelId: 'alerts' }),
    },
    trigger: null, // Immediate
  });
}

/**
 * Check forecast and send alerts for extreme conditions
 */
export async function checkAndSendWeatherAlerts(
  forecast: Array<{ date: string; high_f: number; low_f: number; rainfall_inches: number; conditions: string }>
): Promise<void> {
  const tomorrow = forecast[1];
  if (!tomorrow) return;

  // Frost alert: low temp at or below 35°F
  if (tomorrow.low_f <= 35) {
    await sendWeatherAlert(
      'frost',
      `Tomorrow's low is ${tomorrow.low_f}°F. Cover or bring in tender plants tonight!`
    );
  }

  // Heat alert: high temp above 95°F
  if (tomorrow.high_f >= 95) {
    await sendWeatherAlert(
      'heat',
      `Tomorrow will hit ${tomorrow.high_f}°F. Water deeply this evening and consider shade cloth.`
    );
  }

  // Heavy rain: more than 1.5 inches expected
  const next3DayRain = forecast.slice(0, 3).reduce((sum, d) => sum + d.rainfall_inches, 0);
  if (next3DayRain > 1.5) {
    await sendWeatherAlert(
      'heavy_rain',
      `${next3DayRain.toFixed(1)}" of rain expected over the next 3 days. Skip watering and check drainage.`
    );
  }

  // Drought: no rain for 7+ days and high temps
  const noRainDays = forecast.filter((d) => d.rainfall_inches === 0).length;
  const avgHigh = forecast.reduce((sum, d) => sum + d.high_f, 0) / forecast.length;
  if (noRainDays >= 6 && avgHigh > 85) {
    await sendWeatherAlert(
      'drought',
      `No rain in the 7-day forecast with ${Math.round(avgHigh)}°F average highs. Increase watering depth.`
    );
  }
}

// ============================================================
// NOTIFICATION MANAGEMENT
// ============================================================

/**
 * Cancel all scheduled notifications for a category
 */
async function cancelNotificationsByCategory(category: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matching = scheduled.filter(
    (n) => n.content.categoryIdentifier === category
  );
  for (const notif of matching) {
    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get count of pending scheduled notifications
 */
export async function getScheduledCount(): Promise<{
  watering: number;
  fertilizer: number;
  total: number;
}> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const watering = scheduled.filter((n) => n.content.categoryIdentifier === 'watering').length;
  const fertilizer = scheduled.filter((n) => n.content.categoryIdentifier === 'fertilizer').length;
  return { watering, fertilizer, total: scheduled.length };
}

/**
 * Set up notification action categories (mark as done from notification)
 */
export async function setupNotificationActions(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('watering', [
    {
      identifier: 'MARK_DONE',
      buttonTitle: '✓ Done',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: 'Snooze 1hr',
      options: { opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('fertilizer', [
    {
      identifier: 'MARK_DONE',
      buttonTitle: '✓ Applied',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SKIP',
      buttonTitle: 'Skip',
      options: { opensAppToForeground: false },
    },
  ]);
}

// ============================================================
// HELPERS
// ============================================================

function parseFertilizerFrequency(freq: string): number {
  const lower = freq.toLowerCase();
  if (lower.includes('week')) {
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1]) * 7 : 7;
  }
  if (lower.includes('month')) {
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1]) * 30 : 30;
  }
  if (lower.includes('biweek') || lower.includes('bi-week')) return 14;
  if (lower.includes('daily')) return 1;
  const dayMatch = lower.match(/every\s+(\d+)\s*day/);
  if (dayMatch) return parseInt(dayMatch[1]);
  return 14; // Default to biweekly
}
