import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useGardenStore } from '../../src/store/gardenStore';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SPACING, FONT, SOIL_TYPES } from '../../src/constants';
import { createGarden, updateGarden } from '../../src/services/plants';
import {
  scheduleWateringNotifications,
  scheduleFertilizerNotifications,
  checkAndSendWeatherAlerts,
  cancelAllNotifications,
  getScheduledCount,
} from '../../src/services/notifications';

export default function SettingsScreen() {
  const { activeGarden, gardens, plants, weather, recommendations, loadGardens, setActiveGarden } = useGardenStore();
  const { user, signOut } = useAuthStore();

  const [name, setName] = useState(activeGarden?.name || 'My Garden');
  const [zipCode, setZipCode] = useState(activeGarden?.zip_code || '');
  const [usdaZone, setUsdaZone] = useState(activeGarden?.usda_zone || '');
  const [soilType, setSoilType] = useState(activeGarden?.soil_type || 'loam');
  const [sunExposure, setSunExposure] = useState(activeGarden?.sun_exposure || 'full');
  const [lat, setLat] = useState<number | null>(activeGarden?.latitude || null);
  const [lon, setLon] = useState<number | null>(activeGarden?.longitude || null);
  const [saving, setSaving] = useState(false);

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [scheduledCount, setScheduledCount] = useState({ watering: 0, fertilizer: 0, total: 0 });

  useEffect(() => {
    getScheduledCount().then(setScheduledCount).catch(() => {});
  }, []);
  const [usdaZone, setUsdaZone] = useState(activeGarden?.usda_zone || '');
  const [soilType, setSoilType] = useState(activeGarden?.soil_type || 'loam');
  const [sunExposure, setSunExposure] = useState(activeGarden?.sun_exposure || 'full');
  const [lat, setLat] = useState<number | null>(activeGarden?.latitude || null);
  const [lon, setLon] = useState<number | null>(activeGarden?.longitude || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeGarden) {
      setName(activeGarden.name);
      setZipCode(activeGarden.zip_code || '');
      setUsdaZone(activeGarden.usda_zone || '');
      setSoilType(activeGarden.soil_type);
      setSunExposure(activeGarden.sun_exposure);
      setLat(activeGarden.latitude);
      setLon(activeGarden.longitude);
    }
  }, [activeGarden?.id]);

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enable location access to auto-detect your garden location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(parseFloat(loc.coords.latitude.toFixed(4)));
      setLon(parseFloat(loc.coords.longitude.toFixed(4)));
      Alert.alert('Location set', `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
    } catch (err: any) {
      Alert.alert('Location error', err.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        zip_code: zipCode.trim() || null,
        usda_zone: usdaZone.trim() || null,
        soil_type: soilType,
        sun_exposure: sunExposure,
        latitude: lat,
        longitude: lon,
      };

      if (activeGarden) {
        await updateGarden(activeGarden.id, payload);
      } else {
        await createGarden(payload);
      }
      await loadGardens();
      Alert.alert('Saved', 'Garden settings updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const SUN_OPTIONS = [
    { value: 'full', label: 'Full Sun', icon: '☀️' },
    { value: 'partial', label: 'Partial', icon: '⛅' },
    { value: 'shade', label: 'Shade', icon: '🌥️' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Garden Settings</Text>

      {/* Garden name */}
      <Text style={styles.label}>Garden Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="My Garden" />

      {/* Location */}
      <Text style={styles.label}>Location</Text>
      <TouchableOpacity style={styles.locationButton} onPress={detectLocation}>
        <Ionicons name="location" size={18} color={COLORS.primary} />
        <Text style={styles.locationButtonText}>
          {lat && lon ? `${lat}, ${lon} — Tap to update` : 'Detect my location'}
        </Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Zip Code</Text>
          <TextInput
            style={styles.input}
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="21601"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>USDA Zone</Text>
          <TextInput
            style={styles.input}
            value={usdaZone}
            onChangeText={setUsdaZone}
            placeholder="7b"
          />
        </View>
      </View>

      {/* Soil type */}
      <Text style={styles.label}>Soil Type</Text>
      <View style={styles.chipRow}>
        {SOIL_TYPES.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, soilType === s.value && styles.chipSelected]}
            onPress={() => setSoilType(s.value)}
          >
            <Text style={[styles.chipText, soilType === s.value && styles.chipTextSelected]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sun exposure */}
      <Text style={styles.label}>Sun Exposure</Text>
      <View style={styles.chipRow}>
        {SUN_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, sunExposure === s.value && styles.chipSelected]}
            onPress={() => setSunExposure(s.value)}
          >
            <Text style={[styles.chipText, sunExposure === s.value && styles.chipTextSelected]}>
              {s.icon} {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Settings'}</Text>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          Your garden location and soil data are sent to the AI along with live weather to calculate
          precise watering and fertilizer amounts. The more accurate your settings, the better the
          recommendations.
        </Text>
      </View>

      {/* Multiple gardens */}
      {gardens.length > 1 && (
        <View style={styles.gardenSwitch}>
          <Text style={styles.sectionTitle}>Your Gardens</Text>
          {gardens.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.gardenRow, g.id === activeGarden?.id && styles.gardenRowActive]}
              onPress={() => setActiveGarden(g)}
            >
              <Text style={styles.gardenName}>{g.name}</Text>
              {g.id === activeGarden?.id && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ─── Notifications ─── */}
      <View style={styles.notifSection}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.notifRow}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifLabel}>Push Notifications</Text>
            <Text style={styles.notifDetail}>
              {scheduledCount.total > 0
                ? `${scheduledCount.watering} watering · ${scheduledCount.fertilizer} fertilizer scheduled`
                : 'No reminders scheduled'}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={async (val) => {
              setNotificationsEnabled(val);
              if (!val) {
                await cancelAllNotifications();
                setScheduledCount({ watering: 0, fertilizer: 0, total: 0 });
                Alert.alert('Notifications off', 'All garden reminders cleared.');
              }
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={notificationsEnabled ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={styles.notifButton}
          onPress={async () => {
            if (plants.length === 0 || Object.keys(recommendations).length === 0) {
              Alert.alert('Run analysis first', 'Go to Today tab and run AI analysis before scheduling notifications.');
              return;
            }
            try {
              // Build schedule map from recommendations
              const scheduleMap: Record<string, any> = {};
              plants.forEach((p) => {
                const rec = recommendations[p.id];
                if (rec?.watering) {
                  scheduleMap[p.id] = {
                    plant_id: p.id,
                    frequency_days: rec.watering.frequency_days,
                    preferred_time: '07:00',
                    amount_gallons: rec.watering.amount_gallons,
                    is_active: true,
                  };
                }
              });

              const wCount = await scheduleWateringNotifications(plants, scheduleMap, recommendations);
              const fCount = await scheduleFertilizerNotifications(plants, recommendations);

              if (weather?.forecast) {
                await checkAndSendWeatherAlerts(weather.forecast);
              }

              const counts = await getScheduledCount();
              setScheduledCount(counts);
              Alert.alert(
                'Reminders set!',
                `Scheduled ${wCount} watering and ${fCount} fertilizer reminders for the next 2 weeks.`
              );
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }}
        >
          <Ionicons name="notifications" size={18} color={COLORS.primary} />
          <Text style={styles.notifButtonText}>Schedule All Reminders</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Account ─── */}
      <View style={styles.accountSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountInfo}>
          <Ionicons name="person-circle-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.accountEmail}>{user?.email || 'Not signed in'}</Text>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  heading: { fontSize: FONT.sizes.title, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },
  label: { fontSize: FONT.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONT.sizes.md,
    color: COLORS.text,
  },
  row: { flexDirection: 'row', gap: SPACING.md },
  halfField: { flex: 1 },

  // Location
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  locationButtonText: { fontSize: FONT.sizes.sm, color: COLORS.primary, fontWeight: '500' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT.sizes.sm, color: COLORS.text },
  chipTextSelected: { color: COLORS.textLight, fontWeight: '600' },

  // Save
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  saveButtonText: { color: COLORS.textLight, fontSize: FONT.sizes.md, fontWeight: '700' },

  // Info
  infoCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  infoTitle: { fontSize: FONT.sizes.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  infoText: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },

  // Garden switcher
  gardenSwitch: { marginTop: SPACING.xl },
  sectionTitle: { fontSize: FONT.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  gardenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gardenRowActive: { borderColor: COLORS.primary, borderWidth: 1.5 },
  gardenName: { fontSize: FONT.sizes.md, color: COLORS.text },

  // Notifications
  notifSection: { marginTop: SPACING.xl },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  notifInfo: { flex: 1, marginRight: SPACING.md },
  notifLabel: { fontSize: FONT.sizes.md, fontWeight: '600', color: COLORS.text },
  notifDetail: { fontSize: FONT.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  notifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  notifButtonText: { fontSize: FONT.sizes.md, color: COLORS.primary, fontWeight: '600' },

  // Account
  accountSection: { marginTop: SPACING.xl, marginBottom: SPACING.xxl },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  accountEmail: { fontSize: FONT.sizes.md, color: COLORS.text },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  signOutText: { color: COLORS.error, fontSize: FONT.sizes.md, fontWeight: '600' },
});
