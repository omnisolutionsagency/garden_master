import { supabase } from './supabase';
import { Plant, Garden, WateringLog, FertilizerLog, WateringSchedule } from '../types';

// ============================================================
// GARDENS
// ============================================================

export async function getGardens(): Promise<Garden[]> {
  const { data, error } = await supabase
    .from('gardens')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createGarden(garden: Partial<Garden>): Promise<Garden> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('gardens')
    .insert({ ...garden, user_id: user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGarden(id: string, updates: Partial<Garden>): Promise<Garden> {
  const { data, error } = await supabase
    .from('gardens')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// PLANTS
// ============================================================

export async function getPlants(gardenId: string): Promise<Plant[]> {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .eq('garden_id', gardenId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createPlant(plant: Partial<Plant>): Promise<Plant> {
  const { data, error } = await supabase
    .from('plants')
    .insert(plant)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlant(id: string, updates: Partial<Plant>): Promise<Plant> {
  const { data, error } = await supabase
    .from('plants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archivePlant(id: string): Promise<void> {
  const { error } = await supabase
    .from('plants')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// WATERING
// ============================================================

export async function logWatering(log: Partial<WateringLog>): Promise<WateringLog> {
  const { data, error } = await supabase
    .from('watering_logs')
    .insert(log)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWateringHistory(
  plantId: string,
  limit: number = 14
): Promise<WateringLog[]> {
  const { data, error } = await supabase
    .from('watering_logs')
    .select('*')
    .eq('plant_id', plantId)
    .order('watered_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getGardenWateringHistory(
  gardenId: string,
  days: number = 7
): Promise<Record<string, WateringLog[]>> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await supabase
    .from('watering_logs')
    .select('*, plants!inner(garden_id)')
    .eq('plants.garden_id', gardenId)
    .gte('watered_at', since)
    .order('watered_at', { ascending: false });

  if (error) throw error;

  const grouped: Record<string, WateringLog[]> = {};
  (data || []).forEach((log: any) => {
    if (!grouped[log.plant_id]) grouped[log.plant_id] = [];
    grouped[log.plant_id].push(log);
  });
  return grouped;
}

// ============================================================
// FERTILIZER
// ============================================================

export async function logFertilizer(log: Partial<FertilizerLog>): Promise<FertilizerLog> {
  const { data, error } = await supabase
    .from('fertilizer_logs')
    .insert(log)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFertilizerHistory(
  plantId: string,
  limit: number = 10
): Promise<FertilizerLog[]> {
  const { data, error } = await supabase
    .from('fertilizer_logs')
    .select('*')
    .eq('plant_id', plantId)
    .order('applied_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ============================================================
// SCHEDULES
// ============================================================

export async function getSchedule(plantId: string): Promise<WateringSchedule | null> {
  const { data, error } = await supabase
    .from('watering_schedules')
    .select('*')
    .eq('plant_id', plantId)
    .eq('is_active', true)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function upsertSchedule(
  plantId: string,
  schedule: Partial<WateringSchedule>
): Promise<WateringSchedule> {
  const existing = await getSchedule(plantId);

  if (existing) {
    const { data, error } = await supabase
      .from('watering_schedules')
      .update(schedule)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('watering_schedules')
    .insert({ ...schedule, plant_id: plantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
