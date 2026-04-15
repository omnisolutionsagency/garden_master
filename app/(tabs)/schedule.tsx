import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGardenStore } from '../../src/store/gardenStore';
import { COLORS, SPACING, FONT, PLANT_PRESETS } from '../../src/constants';
import dayjs from 'dayjs';

export default function ScheduleScreen() {
  const { plants, recommendations, weather } = useGardenStore();
  const [selectedDay, setSelectedDay] = useState(0); // 0 = today

  // Build 7-day schedule from AI recommendations
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = dayjs().add(i, 'day');
    return {
      date,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.format('ddd'),
      dateStr: date.format('MMM D'),
      plants: plants.filter((p) => {
        const rec = recommendations[p.id];
        if (!rec?.watering) return false;
        return i % rec.watering.frequency_days === 0;
      }),
    };
  });

  const selected = days[selectedDay];
  const forecastDay = weather?.forecast?.[selectedDay];

  const getIcon = (name: string) =>
    PLANT_PRESETS.find((p) => p.name.toLowerCase() === name.toLowerCase())?.icon || '🌱';

  const totalWater = selected.plants.reduce((sum, p) => {
    const rec = recommendations[p.id];
    return sum + (rec?.watering?.amount_gallons || 0) * p.quantity;
  }, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Day picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPicker}>
        {days.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.dayChip, selectedDay === i && styles.dayChipSelected]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[styles.dayLabel, selectedDay === i && styles.dayLabelSelected]}>
              {day.label}
            </Text>
            <Text style={[styles.dayDate, selectedDay === i && styles.dayDateSelected]}>
              {day.dateStr}
            </Text>
            {day.plants.length > 0 && (
              <View style={[styles.dayDot, selectedDay === i && styles.dayDotSelected]} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Weather for selected day */}
      {forecastDay && (
        <View style={styles.dayWeather}>
          <Text style={styles.dayWeatherText}>
            {forecastDay.conditions === 'Rain' ? '🌧️' : forecastDay.conditions === 'Clouds' ? '☁️' : '☀️'}{' '}
            {forecastDay.high_f}°/{forecastDay.low_f}°F
            {forecastDay.rainfall_inches > 0 && ` · 💧${forecastDay.rainfall_inches}" rain expected`}
          </Text>
        </View>
      )}

      {/* Summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {selected.plants.length} plant{selected.plants.length !== 1 ? 's' : ''} to water
        </Text>
        <Text style={styles.summaryWater}>
          💧 {totalWater.toFixed(1)} gal total
        </Text>
      </View>

      {/* Plant list for day */}
      {selected.plants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyText}>No watering needed {selected.label.toLowerCase()}!</Text>
          {Object.keys(recommendations).length === 0 && (
            <Text style={styles.emptyHint}>Run AI analysis from the Today tab first.</Text>
          )}
        </View>
      ) : (
        selected.plants.map((plant) => {
          const rec = recommendations[plant.id];
          return (
            <TouchableOpacity
              key={plant.id}
              style={styles.plantCard}
              onPress={() => router.push(`/plant/${plant.id}`)}
            >
              <Text style={styles.plantIcon}>{getIcon(plant.name)}</Text>
              <View style={styles.plantInfo}>
                <Text style={styles.plantName}>
                  {plant.name}
                  {plant.quantity > 1 ? ` ×${plant.quantity}` : ''}
                </Text>
                {rec?.watering && (
                  <Text style={styles.plantWater}>
                    💧 {rec.watering.amount_gallons} gal
                    {plant.quantity > 1 ? ` each (${(rec.watering.amount_gallons * plant.quantity).toFixed(1)} total)` : ''}
                  </Text>
                )}
                {rec?.watering?.adjustments?.[0] && (
                  <Text style={styles.plantNote} numberOfLines={1}>
                    ↳ {rec.watering.adjustments[0]}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          );
        })
      )}

      {/* Fertilizer reminders */}
      {selectedDay === 0 && (
        <View style={styles.fertSection}>
          <Text style={styles.sectionTitle}>Fertilizer Schedule</Text>
          {plants.filter((p) => recommendations[p.id]?.fertilizer).length === 0 ? (
            <Text style={styles.placeholder}>No fertilizer recommendations yet.</Text>
          ) : (
            plants
              .filter((p) => recommendations[p.id]?.fertilizer)
              .map((plant) => {
                const rec = recommendations[plant.id];
                return (
                  <View key={plant.id} style={styles.fertRow}>
                    <Text style={styles.fertPlant}>{getIcon(plant.name)} {plant.name}</Text>
                    <Text style={styles.fertDetail}>
                      {rec!.fertilizer!.type} ({rec!.fertilizer!.npk_ratio}) · {rec!.fertilizer!.frequency}
                    </Text>
                  </View>
                );
              })
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  // Day picker
  dayPicker: { marginBottom: SPACING.md },
  dayChip: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 72,
  },
  dayChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayLabel: { fontSize: FONT.sizes.sm, fontWeight: '700', color: COLORS.text },
  dayLabelSelected: { color: COLORS.textLight },
  dayDate: { fontSize: FONT.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  dayDateSelected: { color: '#ffffffcc' },
  dayDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  dayDotSelected: { backgroundColor: COLORS.textLight },

  // Day weather
  dayWeather: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dayWeatherText: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },

  // Summary
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryText: { fontSize: FONT.sizes.md, fontWeight: '600', color: COLORS.text },
  summaryWater: { fontSize: FONT.sizes.sm, color: COLORS.waterBlue, fontWeight: '600' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 36, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONT.sizes.md, color: COLORS.textSecondary },
  emptyHint: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, fontStyle: 'italic' },

  // Plant card
  plantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  plantIcon: { fontSize: 24, marginRight: SPACING.md },
  plantInfo: { flex: 1 },
  plantName: { fontSize: FONT.sizes.md, fontWeight: '600', color: COLORS.text },
  plantWater: { fontSize: FONT.sizes.sm, color: COLORS.waterBlue, marginTop: 2 },
  plantNote: { fontSize: FONT.sizes.xs, color: COLORS.primary, marginTop: 2 },

  // Fertilizer
  fertSection: { marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONT.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  placeholder: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
  fertRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fertPlant: { fontSize: FONT.sizes.md, fontWeight: '600', color: COLORS.text },
  fertDetail: { fontSize: FONT.sizes.sm, color: COLORS.fertilizerBrown, marginTop: 4 },
});
