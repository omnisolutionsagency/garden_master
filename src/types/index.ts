// ============================================================
// Database row types (match Supabase schema)
// ============================================================

export interface Garden {
  id: string;
  user_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  zip_code: string | null;
  usda_zone: string | null;
  soil_type: string;
  sun_exposure: string;
  created_at: string;
  updated_at: string;
}

export interface Plant {
  id: string;
  garden_id: string;
  name: string;
  category: 'herb' | 'vegetable' | 'fruit' | 'flower';
  variety: string | null;
  planted_date: string | null;
  growth_stage: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'dormant';
  container_type: 'ground' | 'raised_bed' | 'pot' | 'hydroponic';
  container_size_gallons: number | null;
  spacing_inches: number | null;
  quantity: number;
  notes: string | null;
  image_uri: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WateringLog {
  id: string;
  plant_id: string;
  watered_at: string;
  amount_gallons: number | null;
  recommended_gallons: number | null;
  method: string;
  source: string;
  notes: string | null;
  created_at: string;
}

export interface FertilizerLog {
  id: string;
  plant_id: string;
  applied_at: string;
  fertilizer_type: string | null;
  amount: string | null;
  npk_ratio: string | null;
  recommended_by: string;
  notes: string | null;
  created_at: string;
}

export interface WeatherSnapshot {
  id: string;
  garden_id: string;
  recorded_at: string;
  temp_f: number | null;
  temp_high_f: number | null;
  temp_low_f: number | null;
  humidity_pct: number | null;
  rainfall_inches: number;
  wind_mph: number | null;
  conditions: string | null;
  uv_index: number | null;
  forecast_json: any;
  created_at: string;
}

export interface WateringSchedule {
  id: string;
  plant_id: string;
  frequency_days: number;
  preferred_time: string;
  amount_gallons: number | null;
  adjust_for_weather: boolean;
  is_active: boolean;
  last_ai_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiAnalysis {
  id: string;
  garden_id: string;
  plant_id: string | null;
  analysis_type: 'watering' | 'fertilizer' | 'health' | 'general';
  prompt_summary: string | null;
  response: AiRecommendation;
  model: string;
  tokens_used: number | null;
  created_at: string;
}

// ============================================================
// AI Response types
// ============================================================

export interface AiRecommendation {
  watering?: {
    amount_gallons: number;
    frequency_days: number;
    reasoning: string;
    adjustments: string[];
  };
  fertilizer?: {
    type: string;
    amount: string;
    frequency: string;
    npk_ratio: string;
    reasoning: string;
  };
  alerts?: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
  summary: string;
}

// ============================================================
// Weather API types
// ============================================================

export interface WeatherData {
  current: {
    temp_f: number;
    humidity: number;
    conditions: string;
    wind_mph: number;
    uv_index: number;
  };
  today: {
    high_f: number;
    low_f: number;
    rainfall_inches: number;
  };
  forecast: Array<{
    date: string;
    high_f: number;
    low_f: number;
    rainfall_inches: number;
    conditions: string;
    humidity: number;
  }>;
}

// ============================================================
// App state types
// ============================================================

export interface PlantWithSchedule extends Plant {
  schedule?: WateringSchedule;
  lastWatered?: WateringLog;
  nextWatering?: string; // ISO date
  needsWater: boolean;
}

export interface DailyTask {
  plant: Plant;
  type: 'water' | 'fertilize';
  amount: string;
  isOverdue: boolean;
  scheduledFor: string;
}
