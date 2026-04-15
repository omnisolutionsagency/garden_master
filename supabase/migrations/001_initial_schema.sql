-- Garden Manager Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GARDENS
-- ============================================================
CREATE TABLE gardens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Garden',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  zip_code TEXT,
  usda_zone TEXT,                    -- e.g. '7b' for Eastern Shore MD
  soil_type TEXT DEFAULT 'loam',     -- sandy, clay, silt, loam, peat
  sun_exposure TEXT DEFAULT 'full',  -- full, partial, shade
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLANTS
-- ============================================================
CREATE TABLE plants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garden_id UUID REFERENCES gardens(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                       -- 'Basil', 'Roma Tomato', etc.
  category TEXT NOT NULL DEFAULT 'herb',    -- herb, vegetable, fruit, flower
  variety TEXT,                             -- specific cultivar
  planted_date DATE,
  growth_stage TEXT DEFAULT 'seedling',     -- seedling, vegetative, flowering, fruiting, dormant
  container_type TEXT DEFAULT 'ground',     -- ground, raised_bed, pot, hydroponic
  container_size_gallons NUMERIC,           -- pot volume if applicable
  spacing_inches NUMERIC,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  image_uri TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WATERING LOG
-- ============================================================
CREATE TABLE watering_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE NOT NULL,
  watered_at TIMESTAMPTZ DEFAULT NOW(),
  amount_gallons NUMERIC,                -- actual water given
  recommended_gallons NUMERIC,           -- what AI recommended
  method TEXT DEFAULT 'manual',          -- manual, drip, sprinkler, soaker
  source TEXT DEFAULT 'user',            -- user, schedule, ai_recommendation
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FERTILIZER LOG
-- ============================================================
CREATE TABLE fertilizer_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  fertilizer_type TEXT,                  -- '10-10-10', 'fish emulsion', 'compost tea', etc.
  amount TEXT,                           -- '1 tbsp per gallon', '2 cups', etc.
  npk_ratio TEXT,                        -- '10-10-10'
  recommended_by TEXT DEFAULT 'user',    -- user, ai
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEATHER SNAPSHOTS (cached from OpenWeatherMap)
-- ============================================================
CREATE TABLE weather_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garden_id UUID REFERENCES gardens(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  temp_f NUMERIC,
  temp_high_f NUMERIC,
  temp_low_f NUMERIC,
  humidity_pct NUMERIC,
  rainfall_inches NUMERIC DEFAULT 0,
  wind_mph NUMERIC,
  conditions TEXT,                       -- 'clear', 'rain', 'cloudy', etc.
  uv_index NUMERIC,
  forecast_json JSONB,                   -- raw 7-day forecast blob
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI ANALYSIS LOG (Claude responses)
-- ============================================================
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garden_id UUID REFERENCES gardens(id) ON DELETE CASCADE NOT NULL,
  plant_id UUID REFERENCES plants(id) ON DELETE SET NULL,
  analysis_type TEXT NOT NULL,           -- 'watering', 'fertilizer', 'health', 'general'
  prompt_summary TEXT,                   -- abbreviated prompt sent
  response JSONB NOT NULL,              -- structured Claude response
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WATERING SCHEDULES
-- ============================================================
CREATE TABLE watering_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE NOT NULL,
  frequency_days INTEGER DEFAULT 1,      -- water every N days
  preferred_time TIME DEFAULT '07:00',   -- morning default
  amount_gallons NUMERIC,
  adjust_for_weather BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_ai_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE gardens ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE watering_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fertilizer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE watering_schedules ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users manage own gardens" ON gardens
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own plants" ON plants
  FOR ALL USING (garden_id IN (SELECT id FROM gardens WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own watering logs" ON watering_logs
  FOR ALL USING (plant_id IN (
    SELECT p.id FROM plants p JOIN gardens g ON p.garden_id = g.id WHERE g.user_id = auth.uid()
  ));

CREATE POLICY "Users manage own fertilizer logs" ON fertilizer_logs
  FOR ALL USING (plant_id IN (
    SELECT p.id FROM plants p JOIN gardens g ON p.garden_id = g.id WHERE g.user_id = auth.uid()
  ));

CREATE POLICY "Users manage own weather" ON weather_snapshots
  FOR ALL USING (garden_id IN (SELECT id FROM gardens WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own analyses" ON ai_analyses
  FOR ALL USING (garden_id IN (SELECT id FROM gardens WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own schedules" ON watering_schedules
  FOR ALL USING (plant_id IN (
    SELECT p.id FROM plants p JOIN gardens g ON p.garden_id = g.id WHERE g.user_id = auth.uid()
  ));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_plants_garden ON plants(garden_id);
CREATE INDEX idx_watering_logs_plant ON watering_logs(plant_id);
CREATE INDEX idx_watering_logs_date ON watering_logs(watered_at);
CREATE INDEX idx_fertilizer_logs_plant ON fertilizer_logs(plant_id);
CREATE INDEX idx_weather_snapshots_garden ON weather_snapshots(garden_id);
CREATE INDEX idx_weather_snapshots_date ON weather_snapshots(recorded_at);
CREATE INDEX idx_ai_analyses_garden ON ai_analyses(garden_id);
CREATE INDEX idx_watering_schedules_plant ON watering_schedules(plant_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gardens_updated_at BEFORE UPDATE ON gardens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER plants_updated_at BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON watering_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
