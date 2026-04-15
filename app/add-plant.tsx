import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGardenStore } from '../src/store/gardenStore';
import {
  COLORS, SPACING, FONT,
  PLANT_PRESETS, GROWTH_STAGES, CONTAINER_TYPES, PlantPreset,
} from '../src/constants';

type Step = 'pick' | 'details';

export default function AddPlantScreen() {
  const { addPlant } = useGardenStore();

  const [step, setStep] = useState<Step>('pick');
  const [search, setSearch] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PlantPreset | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [variety, setVariety] = useState('');
  const [category, setCategory] = useState<string>('herb');
  const [growthStage, setGrowthStage] = useState('seedling');
  const [containerType, setContainerType] = useState('ground');
  const [containerSize, setContainerSize] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredPresets = PLANT_PRESETS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const herbs = filteredPresets.filter((p) => p.category === 'herb');
  const vegs = filteredPresets.filter((p) => p.category === 'vegetable');
  const fruits = filteredPresets.filter((p) => p.category === 'fruit');

  const pickPreset = (preset: PlantPreset) => {
    setSelectedPreset(preset);
    setName(preset.name);
    setCategory(preset.category);
    setStep('details');
  };

  const pickCustom = () => {
    setSelectedPreset(null);
    setName(search || '');
    setStep('details');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your plant a name.');
      return;
    }
    setSaving(true);
    try {
      await addPlant({
        name: name.trim(),
        category: category as any,
        variety: variety.trim() || null,
        growth_stage: growthStage as any,
        container_type: containerType as any,
        container_size_gallons: containerSize ? parseFloat(containerSize) : null,
        quantity: parseInt(quantity) || 1,
        notes: notes.trim() || null,
        planted_date: new Date().toISOString().split('T')[0],
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: Pick a plant ──────────────────────────────
  if (step === 'pick') {
    return (
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        <ScrollView contentContainerStyle={styles.presetList}>
          {[
            { title: '🌿 Herbs', data: herbs },
            { title: '🥬 Vegetables', data: vegs },
            { title: '🍓 Fruits', data: fruits },
          ]
            .filter((s) => s.data.length > 0)
            .map((section) => (
              <View key={section.title}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.presetGrid}>
                  {section.data.map((preset) => (
                    <TouchableOpacity
                      key={preset.name}
                      style={styles.presetChip}
                      onPress={() => pickPreset(preset)}
                    >
                      <Text style={styles.presetIcon}>{preset.icon}</Text>
                      <Text style={styles.presetName}>{preset.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

          <TouchableOpacity style={styles.customButton} onPress={pickCustom}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.customButtonText}>
              {search ? `Add "${search}" as custom plant` : 'Add custom plant'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Step 2: Plant details ─────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.form}>
        <TouchableOpacity style={styles.backLink} onPress={() => setStep('pick')}>
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
          <Text style={styles.backLinkText}>Change plant</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>
          {selectedPreset?.icon || '🌱'} {name || 'New Plant'}
        </Text>

        {/* Name */}
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Plant name" />

        {/* Variety picker (from preset) */}
        {selectedPreset && selectedPreset.commonVarieties.length > 0 && (
          <>
            <Text style={styles.label}>Variety</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {selectedPreset.commonVarieties.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.chip, variety === v && styles.chipSelected]}
                  onPress={() => setVariety(variety === v ? '' : v)}
                >
                  <Text style={[styles.chipText, variety === v && styles.chipTextSelected]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {!selectedPreset.commonVarieties.includes(variety) && (
              <TextInput
                style={[styles.input, { marginTop: SPACING.xs }]}
                value={variety}
                onChangeText={setVariety}
                placeholder="Or type a variety..."
              />
            )}
          </>
        )}

        {/* Growth stage */}
        <Text style={styles.label}>Growth Stage</Text>
        <View style={styles.chipRow}>
          {GROWTH_STAGES.map((gs) => (
            <TouchableOpacity
              key={gs.value}
              style={[styles.chip, growthStage === gs.value && styles.chipSelected]}
              onPress={() => setGrowthStage(gs.value)}
            >
              <Text style={[styles.chipText, growthStage === gs.value && styles.chipTextSelected]}>
                {gs.icon} {gs.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Container */}
        <Text style={styles.label}>Container</Text>
        <View style={styles.chipRow}>
          {CONTAINER_TYPES.map((ct) => (
            <TouchableOpacity
              key={ct.value}
              style={[styles.chip, containerType === ct.value && styles.chipSelected]}
              onPress={() => setContainerType(ct.value)}
            >
              <Text style={[styles.chipText, containerType === ct.value && styles.chipTextSelected]}>
                {ct.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {containerType === 'pot' && (
          <>
            <Text style={styles.label}>Container Size (gallons)</Text>
            <TextInput
              style={styles.input}
              value={containerSize}
              onChangeText={setContainerSize}
              placeholder="e.g. 5"
              keyboardType="numeric"
            />
          </>
        )}

        {/* Quantity */}
        <Text style={styles.label}>Quantity</Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1)))}
          >
            <Ionicons name="remove" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.qtyInput]}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            textAlign="center"
          />
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => setQuantity(String(parseInt(quantity || '0') + 1))}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything specific about this plant..."
          multiline
          numberOfLines={3}
        />

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Add Plant'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, paddingVertical: 14, paddingLeft: SPACING.sm, fontSize: FONT.sizes.md, color: COLORS.text },

  // Presets
  presetList: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  sectionTitle: { fontSize: FONT.sizes.md, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  presetIcon: { fontSize: 18 },
  presetName: { fontSize: FONT.sizes.sm, color: COLORS.text, fontWeight: '500' },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  customButtonText: { fontSize: FONT.sizes.md, color: COLORS.primary, fontWeight: '600' },

  // Form
  form: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.md },
  backLinkText: { color: COLORS.primary, fontSize: FONT.sizes.sm },
  formTitle: { fontSize: FONT.sizes.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },

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

  // Quantity
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyInput: { width: 60 },

  // Save
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  saveButtonText: { color: COLORS.textLight, fontSize: FONT.sizes.md, fontWeight: '700' },
});
