import { create } from 'zustand';
import { Garden, Plant, WeatherData, AiRecommendation, DailyTask } from '../types';
import * as plantService from '../services/plants';
import { getCurrentWeather } from '../services/weather';
import { analyzeFullGarden } from '../services/claude';

interface GardenStore {
  // State
  gardens: Garden[];
  activeGarden: Garden | null;
  plants: Plant[];
  weather: WeatherData | null;
  recommendations: Record<string, AiRecommendation>;
  todaysTasks: DailyTask[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadGardens: () => Promise<void>;
  setActiveGarden: (garden: Garden) => void;
  loadPlants: () => Promise<void>;
  addPlant: (plant: Partial<Plant>) => Promise<Plant>;
  updatePlant: (id: string, updates: Partial<Plant>) => Promise<void>;
  removePlant: (id: string) => Promise<void>;
  refreshWeather: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  logWatering: (plantId: string, gallons: number) => Promise<void>;
  logFertilizer: (plantId: string, type: string, amount: string) => Promise<void>;
  clearError: () => void;
}

export const useGardenStore = create<GardenStore>((set, get) => ({
  gardens: [],
  activeGarden: null,
  plants: [],
  weather: null,
  recommendations: {},
  todaysTasks: [],
  isLoading: false,
  error: null,

  loadGardens: async () => {
    try {
      set({ isLoading: true, error: null });
      const gardens = await plantService.getGardens();
      set({ gardens, activeGarden: gardens[0] || null, isLoading: false });
      if (gardens[0]) {
        get().loadPlants();
        get().refreshWeather();
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setActiveGarden: (garden) => {
    set({ activeGarden: garden, plants: [], recommendations: {} });
    get().loadPlants();
    get().refreshWeather();
  },

  loadPlants: async () => {
    const { activeGarden } = get();
    if (!activeGarden) return;
    try {
      const plants = await plantService.getPlants(activeGarden.id);
      set({ plants });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addPlant: async (plant) => {
    const { activeGarden } = get();
    if (!activeGarden) throw new Error('No active garden');
    const newPlant = await plantService.createPlant({
      ...plant,
      garden_id: activeGarden.id,
    });
    set((s) => ({ plants: [...s.plants, newPlant] }));
    return newPlant;
  },

  updatePlant: async (id, updates) => {
    const updated = await plantService.updatePlant(id, updates);
    set((s) => ({
      plants: s.plants.map((p) => (p.id === id ? updated : p)),
    }));
  },

  removePlant: async (id) => {
    await plantService.archivePlant(id);
    set((s) => ({ plants: s.plants.filter((p) => p.id !== id) }));
  },

  refreshWeather: async () => {
    const { activeGarden } = get();
    if (!activeGarden?.latitude || !activeGarden?.longitude) return;
    try {
      const weather = await getCurrentWeather(
        activeGarden.latitude,
        activeGarden.longitude
      );
      set({ weather });
    } catch (err: any) {
      set({ error: `Weather error: ${err.message}` });
    }
  },

  runAnalysis: async () => {
    const { activeGarden, plants, weather } = get();
    if (!activeGarden || !weather || plants.length === 0) return;

    try {
      set({ isLoading: true });

      const wateringHistory = await plantService.getGardenWateringHistory(activeGarden.id);
      const fertilizerHistory: Record<string, any[]> = {};

      for (const plant of plants) {
        fertilizerHistory[plant.id] = await plantService.getFertilizerHistory(plant.id, 5);
      }

      const recommendations = await analyzeFullGarden(
        activeGarden,
        plants,
        weather,
        wateringHistory,
        fertilizerHistory
      );

      // Build today's task list
      const todaysTasks: DailyTask[] = [];
      for (const plant of plants) {
        const rec = recommendations[plant.id];
        if (!rec) continue;

        const lastWatered = wateringHistory[plant.id]?.[0];
        const daysSince = lastWatered
          ? Math.floor((Date.now() - new Date(lastWatered.watered_at).getTime()) / 86400000)
          : 999;
        const freq = rec.watering?.frequency_days || 1;

        if (daysSince >= freq) {
          todaysTasks.push({
            plant,
            type: 'water',
            amount: `${rec.watering?.amount_gallons || '?'} gal`,
            isOverdue: daysSince > freq,
            scheduledFor: new Date().toISOString(),
          });
        }
      }

      set({ recommendations, todaysTasks, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  logWatering: async (plantId, gallons) => {
    const rec = get().recommendations[plantId];
    await plantService.logWatering({
      plant_id: plantId,
      amount_gallons: gallons,
      recommended_gallons: rec?.watering?.amount_gallons,
      source: 'user',
    });
    // Remove from today's tasks
    set((s) => ({
      todaysTasks: s.todaysTasks.filter(
        (t) => !(t.plant.id === plantId && t.type === 'water')
      ),
    }));
  },

  logFertilizer: async (plantId, type, amount) => {
    await plantService.logFertilizer({
      plant_id: plantId,
      fertilizer_type: type,
      amount,
      recommended_by: 'user',
    });
  },

  clearError: () => set({ error: null }),
}));
