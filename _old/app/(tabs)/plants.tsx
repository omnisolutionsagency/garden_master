import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGardenStore } from '../../src/store/gardenStore';
import { COLORS, SPACING, FONT, PLANT_PRESETS } from '../../src/constants';
import { Plant } from '../../src/types';
import dayjs from 'dayjs';

export default function PlantsScreen() {
  const { plants, recommendations } = useGardenStore();

  const getPlantIcon = (name: string) => {
    return PLANT_PRESETS.find((p) => p.name.toLowerCase() === name.toLowerCase())?.icon || '🌱';
  };

  const renderPlant = ({ item }: { item: Plant }) => {
    const rec = recommendations[item.id];
    const icon = getPlantIcon(item.name);

    return (
      <TouchableOpacity
        style={styles.plantCard}
        onPress={() => router.push(`/plant/${item.id}`)}
        activeOpacity={0.7}
      >
        <Text style={styles.plantIcon}>{icon}</Text>
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>{item.name}</Text>
          <Text style={styles.plantMeta}>
            {item.variety ? `${item.variety} · ` : ''}
            {item.growth_stage} · {item.container_type.replace('_', ' ')}
            {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
          </Text>
          {rec?.summary && (
            <Text style={styles.plantSummary} numberOfLines={1}>
              {rec.summary}
            </Text>
          )}
        </View>
        <View style={styles.plantRight}>
          {rec?.watering && (
            <Text style={styles.waterAmount}>💧 {rec.watering.amount_gallons}g</Text>
          )}
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const herbs = plants.filter((p) => p.category === 'herb');
  const vegs = plants.filter((p) => p.category === 'vegetable');
  const fruits = plants.filter((p) => p.category === 'fruit');
  const other = plants.filter((p) => !['herb', 'vegetable', 'fruit'].includes(p.category));

  const sections = [
    { title: 'Herbs', data: herbs, emoji: '🌿' },
    { title: 'Vegetables', data: vegs, emoji: '🥬' },
    { title: 'Fruits', data: fruits, emoji: '🍓' },
    { title: 'Other', data: other, emoji: '🌻' },
  ].filter((s) => s.data.length > 0);

  return (
    <View style={styles.container}>
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id}
        renderItem={renderPlant}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerCount}>
              {plants.length} plant{plants.length !== 1 ? 's' : ''}
            </Text>
            {sections.map((s) => (
              <Text key={s.title} style={styles.headerBreakdown}>
                {s.emoji} {s.data.length} {s.title.toLowerCase()}
              </Text>
            ))}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>No plants yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to add your first plant
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-plant')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md, paddingBottom: 100 },

  header: {
    marginBottom: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  headerCount: { fontSize: FONT.sizes.md, fontWeight: '700', color: COLORS.text, marginRight: SPACING.sm },
  headerBreakdown: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary },

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
  plantIcon: { fontSize: 28, marginRight: SPACING.md },
  plantInfo: { flex: 1 },
  plantName: { fontSize: FONT.sizes.md, fontWeight: '600', color: COLORS.text },
  plantMeta: { fontSize: FONT.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  plantSummary: { fontSize: FONT.sizes.xs, color: COLORS.primary, marginTop: 4, fontStyle: 'italic' },
  plantRight: { alignItems: 'flex-end', gap: 4 },
  waterAmount: { fontSize: FONT.sizes.xs, color: COLORS.waterBlue, fontWeight: '600' },

  empty: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT.sizes.xl, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: FONT.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.sm },

  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});
