import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGardenStore } from '../../src/store/gardenStore';
import { COLORS, SPACING, FONT } from '../../src/constants';
import { checkFrostRisk } from '../../src/services/weather';
import dayjs from 'dayjs';

export default function TodayScreen() {
  const {
    activeGarden,
    plants,
    weather,
    todaysTasks,
    recommendations,
    isLoading,
    error,
    refreshWeather,
    runAnalysis,
    logWatering,
    clearError,
  } = useGardenStore();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshWeather();
    await runAnalysis();
    setRefreshing(false);
  };

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleWater = (plantId: string, plantName: string, amount: string) => {
    const gallons = parseFloat(amount) || 0;
    Alert.alert(
      `Water ${plantName}?`,
      `Log ${gallons} gallons of watering?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Done ✓',
          onPress: () => logWatering(plantId, gallons),
        },
      ]
    );
  };

  const hasFrostRisk = weather?.forecast ? checkFrostRisk(weather.forecast) : false;
  const totalTasks = todaysTasks.length;
  const overdueTasks = todaysTasks.filter((t) => t.isOverdue).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Weather Card */}
      {weather && (
        <View style={styles.weatherCard}>
          <View style={styles.weatherHeader}>
            <Text style={styles.weatherTemp}>{weather.current.temp_f}°F</Text>
            <View style={styles.weatherDetails}>
              <Text style={styles.weatherCondition}>{weather.current.conditions}</Text>
              <Text style={styles.weatherRange}>
                H: {weather.today.high_f}° L: {weather.today.low_f}°
              </Text>
            </View>
          </View>
          <View style={styles.weatherStats}>
            <WeatherStat icon="water" label="Humidity" value={`${weather.current.humidity}%`} />
            <WeatherStat icon="speedometer" label="Wind" value={`${weather.current.wind_mph} mph`} />
            <WeatherStat icon="rainy" label="Rain" value={`${weather.today.rainfall_inches}"`} />
            <WeatherStat icon="sunny" label="UV" value={`${weather.current.uv_index}`} />
          </View>
          {hasFrostRisk && (
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={16} color={COLORS.error} />
              <Text style={styles.alertText}>Frost risk in forecast — protect tender plants!</Text>
            </View>
          )}
        </View>
      )}

      {/* Tasks Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{totalTasks}</Text>
          <Text style={styles.summaryLabel}>Tasks Today</Text>
        </View>
        <View style={[styles.summaryCard, overdueTasks > 0 && styles.overdueCard]}>
          <Text style={[styles.summaryNumber, overdueTasks > 0 && styles.overdueText]}>
            {overdueTasks}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{plants.length}</Text>
          <Text style={styles.summaryLabel}>Plants</Text>
        </View>
      </View>

      {/* AI Analysis Button */}
      <TouchableOpacity
        style={styles.analyzeButton}
        onPress={runAnalysis}
        disabled={isLoading || plants.length === 0}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.textLight} />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color={COLORS.textLight} />
            <Text style={styles.analyzeButtonText}>
              {Object.keys(recommendations).length > 0
                ? 'Refresh AI Analysis'
                : 'Analyze My Garden'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Today's Tasks */}
      <Text style={styles.sectionTitle}>Today's Tasks</Text>
      {todaysTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>
            {plants.length === 0
              ? 'Add some plants to get started!'
              : 'All caught up! Run AI analysis to check.'}
          </Text>
        </View>
      ) : (
        todaysTasks.map((task, i) => (
          <View
            key={`${task.plant.id}-${task.type}-${i}`}
            style={[styles.taskCard, task.isOverdue && styles.overdueTaskCard]}
          >
            <View style={styles.taskLeft}>
              {task.isOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueBadgeText}>OVERDUE</Text>
                </View>
              )}
              <Text style={styles.taskPlant}>{task.plant.name}</Text>
              <Text style={styles.taskDetail}>
                {task.type === 'water' ? '💧' : '🌱'} {task.amount}
              </Text>
              {recommendations[task.plant.id]?.watering?.reasoning && (
                <Text style={styles.taskReasoning} numberOfLines={2}>
                  {recommendations[task.plant.id].watering!.reasoning}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.taskAction}
              onPress={() => handleWater(task.plant.id, task.plant.name, task.amount)}
            >
              <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* AI Alerts */}
      {Object.entries(recommendations).map(([plantId, rec]) =>
        (rec.alerts || []).map((alert, i) => (
          <View
            key={`alert-${plantId}-${i}`}
            style={[
              styles.alertCard,
              alert.severity === 'critical' && styles.alertCritical,
              alert.severity === 'warning' && styles.alertWarning,
            ]}
          >
            <Ionicons
              name={alert.severity === 'critical' ? 'alert-circle' : 'information-circle'}
              size={20}
              color={alert.severity === 'critical' ? COLORS.error : COLORS.warning}
            />
            <Text style={styles.alertCardText}>{alert.message}</Text>
          </View>
        ))
      )}

      {/* 7-Day Forecast Mini */}
      {weather && (
        <>
          <Text style={styles.sectionTitle}>7-Day Forecast</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastRow}>
            {weather.forecast.map((day) => (
              <View key={day.date} style={styles.forecastDay}>
                <Text style={styles.forecastDayName}>
                  {dayjs(day.date).format('ddd')}
                </Text>
                <Text style={styles.forecastCondition}>
                  {day.conditions === 'Rain' ? '🌧️' : day.conditions === 'Clouds' ? '☁️' : '☀️'}
                </Text>
                <Text style={styles.forecastTemp}>{day.high_f}°</Text>
                <Text style={styles.forecastTempLow}>{day.low_f}°</Text>
                {day.rainfall_inches > 0 && (
                  <Text style={styles.forecastRain}>💧{day.rainfall_inches}"</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

function WeatherStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.weatherStatItem}>
      <Ionicons name={icon as any} size={16} color={COLORS.textLight} />
      <Text style={styles.weatherStatValue}>{value}</Text>
      <Text style={styles.weatherStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  // Weather
  weatherCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  weatherHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  weatherTemp: { fontSize: 48, fontWeight: '200', color: COLORS.textLight, marginRight: SPACING.md },
  weatherDetails: { flex: 1 },
  weatherCondition: { fontSize: FONT.sizes.lg, color: COLORS.textLight, fontWeight: '600' },
  weatherRange: { fontSize: FONT.sizes.sm, color: '#ffffffaa', marginTop: 2 },
  weatherStats: { flexDirection: 'row', justifyContent: 'space-between' },
  weatherStatItem: { alignItems: 'center' },
  weatherStatValue: { fontSize: FONT.sizes.sm, color: COLORS.textLight, fontWeight: '600', marginTop: 4 },
  weatherStatLabel: { fontSize: FONT.sizes.xs, color: '#ffffff88' },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff20',
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  alertText: { color: COLORS.textLight, fontSize: FONT.sizes.sm, flex: 1 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overdueCard: { borderColor: COLORS.error, borderWidth: 1.5 },
  summaryNumber: { fontSize: FONT.sizes.xxl, fontWeight: '700', color: COLORS.text },
  overdueText: { color: COLORS.error },
  summaryLabel: { fontSize: FONT.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Analyze
  analyzeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  analyzeButtonText: { color: COLORS.textLight, fontSize: FONT.sizes.md, fontWeight: '700' },

  // Sections
  sectionTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  // Empty
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  emptyIcon: { fontSize: 36, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONT.sizes.md, color: COLORS.textSecondary, textAlign: 'center' },

  // Tasks
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overdueTaskCard: { borderColor: COLORS.error, borderWidth: 1.5 },
  taskLeft: { flex: 1 },
  taskPlant: { fontSize: FONT.sizes.md, fontWeight: '600', color: COLORS.text },
  taskDetail: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  taskReasoning: { fontSize: FONT.sizes.xs, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
  taskAction: { marginLeft: SPACING.md },
  overdueBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  overdueBadgeText: { color: COLORS.textLight, fontSize: 10, fontWeight: '700' },

  // Alerts
  alertCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  alertCritical: { borderLeftColor: COLORS.error, backgroundColor: '#C44B4B10' },
  alertWarning: { borderLeftColor: COLORS.warning, backgroundColor: '#E8A83810' },
  alertCardText: { flex: 1, fontSize: FONT.sizes.sm, color: COLORS.text },

  // Forecast
  forecastRow: { marginBottom: SPACING.lg },
  forecastDay: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 72,
  },
  forecastDayName: { fontSize: FONT.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
  forecastCondition: { fontSize: 20, marginVertical: 4 },
  forecastTemp: { fontSize: FONT.sizes.sm, fontWeight: '700', color: COLORS.text },
  forecastTempLow: { fontSize: FONT.sizes.xs, color: COLORS.textSecondary },
  forecastRain: { fontSize: FONT.sizes.xs, color: COLORS.waterBlue, marginTop: 2 },
});
