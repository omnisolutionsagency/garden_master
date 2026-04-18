import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGardenStore } from '../../src/store/gardenStore';
import { COLORS, SPACING, FONT, PLANT_PRESETS, GROWTH_STAGES } from '../../src/constants';
import { getWateringHistory, getFertilizerHistory, getSchedule } from '../../src/services/plants';
import { analyzeGardenPlant, chatAboutPlant, ChatMessage } from '../../src/services/claude';
import { WateringLog, FertilizerLog, WateringSchedule, AiRecommendation } from '../../src/types';
import dayjs from 'dayjs';

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plants, activeGarden, weather, recommendations, logWatering, removePlant } = useGardenStore();

  const plant = plants.find((p) => p.id === id);
  const rec = id ? recommendations[id] : undefined;

  const [wateringHistory, setWateringHistory] = useState<WateringLog[]>([]);
  const [fertHistory, setFertHistory] = useState<FertilizerLog[]>([]);
  const [schedule, setSchedule] = useState<WateringSchedule | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [localRec, setLocalRec] = useState<AiRecommendation | null>(null);
  const [waterAmount, setWaterAmount] = useState('');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);

  const displayRec = localRec || rec;
  const icon = PLANT_PRESETS.find((p) => p.name.toLowerCase() === plant?.name.toLowerCase())?.icon || '🌱';

  useEffect(() => {
    if (!id) return;
    getWateringHistory(id, 14).then(setWateringHistory).catch(() => {});
    getFertilizerHistory(id, 10).then(setFertHistory).catch(() => {});
    getSchedule(id).then(setSchedule).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (displayRec?.watering?.amount_gallons) {
      setWaterAmount(String(displayRec.watering.amount_gallons));
    }
  }, [displayRec]);

  const handleAnalyze = async () => {
    if (!plant || !activeGarden || !weather) return;
    setAnalyzing(true);
    try {
      const result = await analyzeGardenPlant({
        garden: activeGarden,
        plant,
        weather,
        recentWatering: wateringHistory,
        recentFertilizer: fertHistory,
      });
      setLocalRec(result);
    } catch (err: any) {
      Alert.alert('Analysis Error', err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleWaterNow = () => {
    if (!id) return;
    const gal = parseFloat(waterAmount) || 0;
    Alert.alert('Log Watering', `Record ${gal} gallons?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log It', onPress: () => logWatering(id, gal) },
    ]);
  };

  const handleSendChat = async () => {
    if (!plant) return;
    const trimmed = chatInput.trim();
    if (!trimmed || chatSending) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatInput('');
    setChatError(null);
    setChatSending(true);

    try {
      const reply = await chatAboutPlant({
        plant,
        garden: activeGarden,
        weather,
        recentWatering: wateringHistory,
        recentFertilizer: fertHistory,
        history: chatMessages,
        userMessage: trimmed,
      });
      setChatMessages([...nextHistory, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setChatError(err.message || 'Something went wrong.');
    } finally {
      setChatSending(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const handleClearChat = () => {
    if (chatMessages.length === 0) return;
    Alert.alert('Clear chat?', 'This removes all messages in this conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setChatMessages([]);
          setChatError(null);
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Remove Plant', `Archive ${plant?.name}? You can't undo this.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removePlant(id);
          router.back();
        },
      },
    ]);
  };

  if (!plant) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Plant not found</Text>
      </View>
    );
  }

  const lastWatered = wateringHistory[0];
  const daysSinceWatered = lastWatered
    ? Math.floor((Date.now() - new Date(lastWatered.watered_at).getTime()) / 86400000)
    : null;

  const stageInfo = GROWTH_STAGES.find((g) => g.value === plant.growth_stage);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name}>{plant.name}</Text>
        {plant.variety && <Text style={styles.variety}>{plant.variety}</Text>}
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stageInfo?.icon} {stageInfo?.label}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{plant.container_type.replace('_', ' ')}</Text>
          </View>
          {plant.quantity > 1 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>×{plant.quantity}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick water */}
      <View style={styles.waterCard}>
        <View style={styles.waterLeft}>
          <Text style={styles.waterLabel}>
            {daysSinceWatered !== null ? `Last watered ${daysSinceWatered}d ago` : 'No watering recorded'}
          </Text>
          <View style={styles.waterInputRow}>
            <TextInput
              style={styles.waterInput}
              value={waterAmount}
              onChangeText={setWaterAmount}
              keyboardType="numeric"
              placeholder="0.0"
            />
            <Text style={styles.waterUnit}>gal</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.waterButton} onPress={handleWaterNow}>
          <Ionicons name="water" size={22} color={COLORS.textLight} />
          <Text style={styles.waterButtonText}>Water</Text>
        </TouchableOpacity>
      </View>

      {/* AI Recommendation */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Recommendation</Text>
          <TouchableOpacity onPress={handleAnalyze} disabled={analyzing}>
            {analyzing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.refreshLink}>
                <Ionicons name="sparkles" size={14} /> {displayRec ? 'Refresh' : 'Analyze'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {displayRec ? (
          <View style={styles.recCard}>
            <Text style={styles.recSummary}>{displayRec.summary}</Text>

            {displayRec.watering && (
              <View style={styles.recRow}>
                <Text style={styles.recIcon}>💧</Text>
                <View style={styles.recInfo}>
                  <Text style={styles.recLabel}>
                    {displayRec.watering.amount_gallons} gal every {displayRec.watering.frequency_days}d
                  </Text>
                  <Text style={styles.recDetail}>{displayRec.watering.reasoning}</Text>
                  {displayRec.watering.adjustments?.map((adj, i) => (
                    <Text key={i} style={styles.recAdjustment}>↳ {adj}</Text>
                  ))}
                </View>
              </View>
            )}

            {displayRec.fertilizer && (
              <View style={styles.recRow}>
                <Text style={styles.recIcon}>🌱</Text>
                <View style={styles.recInfo}>
                  <Text style={styles.recLabel}>
                    {displayRec.fertilizer.type} ({displayRec.fertilizer.npk_ratio})
                  </Text>
                  <Text style={styles.recDetail}>
                    {displayRec.fertilizer.amount} · {displayRec.fertilizer.frequency}
                  </Text>
                  <Text style={styles.recDetail}>{displayRec.fertilizer.reasoning}</Text>
                </View>
              </View>
            )}

            {(displayRec.alerts || []).map((alert, i) => (
              <View
                key={i}
                style={[
                  styles.alertRow,
                  alert.severity === 'critical' && { borderLeftColor: COLORS.error },
                  alert.severity === 'warning' && { borderLeftColor: COLORS.warning },
                ]}
              >
                <Text style={styles.alertMsg}>{alert.message}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholder}>
            Tap "Analyze" to get AI-powered care recommendations based on current weather and plant history.
          </Text>
        )}
      </View>

      {/* Watering History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Watering</Text>
        {wateringHistory.length === 0 ? (
          <Text style={styles.placeholder}>No watering logged yet</Text>
        ) : (
          wateringHistory.slice(0, 7).map((log) => (
            <View key={log.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{dayjs(log.watered_at).format('MMM D, h:mm A')}</Text>
              <Text style={styles.historyAmount}>
                {log.amount_gallons != null ? `${log.amount_gallons} gal` : '—'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Fertilizer History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Fertilizer</Text>
        {fertHistory.length === 0 ? (
          <Text style={styles.placeholder}>No fertilizer logged yet</Text>
        ) : (
          fertHistory.slice(0, 5).map((log) => (
            <View key={log.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{dayjs(log.applied_at).format('MMM D')}</Text>
              <Text style={styles.historyAmount}>
                {log.fertilizer_type || '—'} · {log.amount || '—'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Notes */}
      {plant.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{plant.notes}</Text>
        </View>
      )}

      {/* Chat with AI */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ask the Gardener</Text>
          {chatMessages.length > 0 && (
            <TouchableOpacity onPress={handleClearChat}>
              <Text style={styles.clearChatLink}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.chatCard}>
          {chatMessages.length === 0 ? (
            <Text style={styles.chatPlaceholder}>
              Ask anything about {plant.name} — pests, pruning, harvesting, diseases, companion plants, etc.
            </Text>
          ) : (
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatScrollContent}
              nestedScrollEnabled
            >
              {chatMessages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.chatBubble,
                    msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAi,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatBubbleText,
                      msg.role === 'user' && styles.chatBubbleTextUser,
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              ))}
              {chatSending && (
                <View style={[styles.chatBubble, styles.chatBubbleAi]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              )}
            </ScrollView>
          )}

          {chatError && <Text style={styles.chatErrorText}>{chatError}</Text>}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a question..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                maxLength={800}
                editable={!chatSending}
                onSubmitEditing={handleSendChat}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendButton,
                  (!chatInput.trim() || chatSending) && styles.chatSendButtonDisabled,
                ]}
                onPress={handleSendChat}
                disabled={!chatInput.trim() || chatSending}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={
                    !chatInput.trim() || chatSending ? COLORS.textSecondary : COLORS.textLight
                  }
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        <Text style={styles.deleteText}>Remove Plant</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: FONT.sizes.md, color: COLORS.error },

  // Header
  header: { alignItems: 'center', paddingVertical: SPACING.lg },
  icon: { fontSize: 48 },
  name: { fontSize: FONT.sizes.title, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm },
  variety: { fontSize: FONT.sizes.md, color: COLORS.textSecondary },
  badges: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  badge: { backgroundColor: COLORS.surfaceAlt, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 12 },
  badgeText: { fontSize: FONT.sizes.xs, color: COLORS.textSecondary },

  // Water quick action
  waterCard: {
    backgroundColor: COLORS.waterBlue + '15',
    borderRadius: 14,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.waterBlue + '40',
    marginBottom: SPACING.lg,
  },
  waterLeft: { flex: 1 },
  waterLabel: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  waterInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  waterInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 70,
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  waterUnit: { fontSize: FONT.sizes.md, color: COLORS.textSecondary },
  waterButton: {
    backgroundColor: COLORS.waterBlue,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  waterButtonText: { color: COLORS.textLight, fontSize: FONT.sizes.xs, fontWeight: '700' },

  // Sections
  section: { marginBottom: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONT.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  refreshLink: { fontSize: FONT.sizes.sm, color: COLORS.primary, fontWeight: '600' },
  placeholder: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, fontStyle: 'italic' },

  // Recommendation
  recCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recSummary: { fontSize: FONT.sizes.md, color: COLORS.text, marginBottom: SPACING.md, lineHeight: 22 },
  recRow: { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.sm },
  recIcon: { fontSize: 20, marginTop: 2 },
  recInfo: { flex: 1 },
  recLabel: { fontSize: FONT.sizes.md, fontWeight: '600', color: COLORS.text },
  recDetail: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  recAdjustment: { fontSize: FONT.sizes.xs, color: COLORS.primary, marginTop: 2 },
  alertRow: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  alertMsg: { fontSize: FONT.sizes.sm, color: COLORS.text },

  // History
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyDate: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary },
  historyAmount: { fontSize: FONT.sizes.sm, fontWeight: '600', color: COLORS.text },

  // Notes
  notesText: { fontSize: FONT.sizes.md, color: COLORS.text, lineHeight: 22 },

  // Chat
  clearChatLink: { fontSize: FONT.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  chatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatPlaceholder: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  chatScroll: { maxHeight: 360 },
  chatScrollContent: { paddingVertical: SPACING.sm },
  chatBubble: {
    maxWidth: '88%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 14,
    marginBottom: SPACING.sm,
  },
  chatBubbleUser: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatBubbleAi: {
    backgroundColor: COLORS.surfaceAlt,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatBubbleText: {
    fontSize: FONT.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  chatBubbleTextUser: { color: COLORS.textLight },
  chatErrorText: {
    fontSize: FONT.sizes.xs,
    color: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.xs,
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: FONT.sizes.sm,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  chatSendButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatSendButtonDisabled: { backgroundColor: COLORS.border },

  // Delete
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    marginTop: SPACING.lg,
  },
  deleteText: { color: COLORS.error, fontSize: FONT.sizes.md },
});
