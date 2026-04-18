import { supabase } from './supabase';
import { Plant, WeatherData, WateringLog, FertilizerLog, AiRecommendation, Garden } from '../types';

interface AnalysisInput {
  garden: Garden;
  plant: Plant;
  weather: WeatherData;
  recentWatering: WateringLog[];
  recentFertilizer: FertilizerLog[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInput {
  plant: Plant;
  garden?: Garden | null;
  weather?: WeatherData | null;
  recentWatering?: WateringLog[];
  recentFertilizer?: FertilizerLog[];
  history: ChatMessage[];
  userMessage: string;
}

/**
 * Call the Supabase Edge Function which proxies to Claude API.
 * Keeps the Anthropic API key server-side.
 */
export async function analyzeGardenPlant(input: AnalysisInput): Promise<AiRecommendation> {
  const prompt = buildPrompt(input);
  const body = {
    prompt,
    plant_id: input.plant.id,
    garden_id: input.garden.id,
    analysis_type: 'watering',
  };

  await ensureFreshSession();

  let { data, error } = await supabase.functions.invoke('analyze-garden', { body });

  // Gateway 401 = stale/expired JWT. Force a refresh and retry once.
  if (error && (await isJwtError(error))) {
    const { error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) {
      throw new Error('AI analysis failed: session expired, please sign in again');
    }
    ({ data, error } = await supabase.functions.invoke('analyze-garden', { body }));
  }

  if (error) {
    let detail = error.message;
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const errBody = await ctx.json();
        detail = errBody?.error || JSON.stringify(errBody);
      } else if (ctx && typeof ctx.text === 'function') {
        detail = await ctx.text();
      }
    } catch {
      // Fall back to error.message
    }
    throw new Error(`AI analysis failed: ${detail}`);
  }

  if (data?.error) throw new Error(`AI analysis failed: ${data.error}`);
  if (!data?.recommendation) {
    throw new Error('AI analysis failed: empty response from edge function');
  }
  return data.recommendation as AiRecommendation;
}

// Refresh proactively if the access token is missing or expires within 60s.
async function ensureFreshSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return; // No session → invoke will use anon key, let the server decide.
  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAt - nowSec < 60) {
    await supabase.auth.refreshSession();
  }
}

async function isJwtError(error: unknown): Promise<boolean> {
  const ctx: any = (error as any)?.context;
  const status = ctx?.status ?? (error as any)?.status;
  if (status !== 401) return false;
  try {
    if (ctx && typeof ctx.clone === 'function') {
      const text = await ctx.clone().text();
      return /jwt|token|unauthor/i.test(text);
    }
  } catch {
    // ignore
  }
  return true; // Any 401 from the gateway is worth one refresh attempt.
}

/**
 * Send a chat message about a specific plant. Returns the assistant's reply.
 * History should include prior turns; userMessage is appended as the newest user turn.
 */
export async function chatAboutPlant(input: ChatInput): Promise<string> {
  const system = buildChatSystem(input);
  const messages: ChatMessage[] = [
    ...input.history.filter((m) => m.content.trim().length > 0),
    { role: 'user', content: input.userMessage },
  ];

  const body = {
    mode: 'chat' as const,
    system,
    messages,
    plant_id: input.plant.id,
    garden_id: input.garden?.id,
  };

  await ensureFreshSession();

  let { data, error } = await supabase.functions.invoke('analyze-garden', { body });

  if (error && (await isJwtError(error))) {
    const { error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) {
      throw new Error('Chat failed: session expired, please sign in again');
    }
    ({ data, error } = await supabase.functions.invoke('analyze-garden', { body }));
  }

  if (error) {
    let detail = error.message;
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const errBody = await ctx.json();
        detail = errBody?.error || JSON.stringify(errBody);
      } else if (ctx && typeof ctx.text === 'function') {
        detail = await ctx.text();
      }
    } catch {
      // Fall back to error.message
    }
    throw new Error(`Chat failed: ${detail}`);
  }

  if (data?.error) throw new Error(`Chat failed: ${data.error}`);
  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  if (!reply) throw new Error('Chat failed: empty response');
  return reply;
}

function buildChatSystem(input: ChatInput): string {
  const { plant, garden, weather, recentWatering, recentFertilizer } = input;

  const lastWatered = recentWatering?.[0];
  const daysSinceWatered = lastWatered
    ? Math.floor((Date.now() - new Date(lastWatered.watered_at).getTime()) / 86400000)
    : null;

  const lastFert = recentFertilizer?.[0];
  const daysSinceFert = lastFert
    ? Math.floor((Date.now() - new Date(lastFert.applied_at).getTime()) / 86400000)
    : null;

  const weatherLine = weather
    ? `Current weather: ${weather.current.temp_f}°F, ${weather.current.conditions}, humidity ${weather.current.humidity}%, today H/L ${weather.today.high_f}/${weather.today.low_f}°F, rainfall ${weather.today.rainfall_inches}".`
    : 'Weather data is unavailable.';

  const gardenLine = garden
    ? `Garden: USDA zone ${garden.usda_zone || 'unknown'}, soil ${garden.soil_type}, sun ${garden.sun_exposure}.`
    : '';

  return `You are a friendly, knowledgeable master gardener helping the user care for a specific plant.
Keep answers concise, practical, and tailored to the plant and conditions below. If you don't know something, say so. Use plain text (no markdown headings, no JSON).

PLANT: ${plant.name}${plant.variety ? ` (${plant.variety})` : ''}
- Category: ${plant.category}
- Growth stage: ${plant.growth_stage}
- Container: ${plant.container_type}${plant.container_size_gallons ? ` (${plant.container_size_gallons} gal)` : ''}
- Quantity: ${plant.quantity}
- Planted: ${plant.planted_date || 'unknown'}
${plant.notes ? `- Notes: ${plant.notes}` : ''}
${gardenLine}
${weatherLine}
WATERING: ${daysSinceWatered !== null ? `last watered ${daysSinceWatered} day(s) ago (${lastWatered?.amount_gallons ?? '?'} gal)` : 'no watering recorded'}.
FERTILIZER: ${daysSinceFert !== null ? `last applied ${daysSinceFert} day(s) ago (${lastFert?.fertilizer_type || '?'})` : 'no fertilizer recorded'}.`;
}

/**
 * Batch analysis for all active plants in a garden
 */
export async function analyzeFullGarden(
  garden: Garden,
  plants: Plant[],
  weather: WeatherData,
  wateringHistory: Record<string, WateringLog[]>,
  fertilizerHistory: Record<string, FertilizerLog[]>
): Promise<Record<string, AiRecommendation>> {
  const results: Record<string, AiRecommendation> = {};

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 3;
  for (let i = 0; i < plants.length; i += BATCH_SIZE) {
    const batch = plants.slice(i, i + BATCH_SIZE);
    const promises = batch.map((plant) =>
      analyzeGardenPlant({
        garden,
        plant,
        weather,
        recentWatering: wateringHistory[plant.id] || [],
        recentFertilizer: fertilizerHistory[plant.id] || [],
      }).then((rec) => {
        results[plant.id] = rec;
      })
    );
    await Promise.all(promises);
  }

  return results;
}

/**
 * Build a structured prompt for Claude with all relevant context
 */
function buildPrompt(input: AnalysisInput): string {
  const { garden, plant, weather, recentWatering, recentFertilizer } = input;

  const lastWatered = recentWatering[0];
  const daysSinceWatered = lastWatered
    ? Math.floor((Date.now() - new Date(lastWatered.watered_at).getTime()) / 86400000)
    : null;

  const lastFertilized = recentFertilizer[0];
  const daysSinceFertilized = lastFertilized
    ? Math.floor((Date.now() - new Date(lastFertilized.applied_at).getTime()) / 86400000)
    : null;

  const upcomingRain = weather.forecast
    .slice(0, 3)
    .reduce((sum, d) => sum + d.rainfall_inches, 0);

  return `You are a master gardener assistant. Analyze the following garden data and provide specific, actionable care recommendations.

GARDEN CONTEXT:
- Location zone: USDA ${garden.usda_zone || 'unknown'}
- Soil type: ${garden.soil_type}
- Sun exposure: ${garden.sun_exposure}

PLANT:
- Name: ${plant.name} (${plant.variety || 'standard variety'})
- Category: ${plant.category}
- Growth stage: ${plant.growth_stage}
- Container: ${plant.container_type}${plant.container_size_gallons ? ` (${plant.container_size_gallons} gal)` : ''}
- Quantity: ${plant.quantity}
- Planted: ${plant.planted_date || 'unknown'}

CURRENT WEATHER:
- Temperature: ${weather.current.temp_f}°F (High: ${weather.today.high_f}°F, Low: ${weather.today.low_f}°F)
- Humidity: ${weather.current.humidity}%
- Conditions: ${weather.current.conditions}
- Wind: ${weather.current.wind_mph} mph
- UV Index: ${weather.current.uv_index}
- Today's rainfall: ${weather.today.rainfall_inches}" inches
- Rain expected next 3 days: ${upcomingRain.toFixed(2)}" total

7-DAY FORECAST:
${weather.forecast.map((d) => `  ${d.date}: ${d.high_f}°/${d.low_f}°F, ${d.conditions}, Rain: ${d.rainfall_inches}"`).join('\n')}

WATERING HISTORY:
- Last watered: ${daysSinceWatered !== null ? `${daysSinceWatered} days ago (${lastWatered?.amount_gallons || '?'} gal)` : 'No records'}
- Recent logs: ${recentWatering.slice(0, 5).map((w) => `${w.watered_at.split('T')[0]}: ${w.amount_gallons || '?'} gal`).join(', ') || 'None'}

FERTILIZER HISTORY:
- Last fertilized: ${daysSinceFertilized !== null ? `${daysSinceFertilized} days ago (${lastFertilized?.fertilizer_type || '?'})` : 'No records'}

Respond with ONLY a JSON object (no markdown, no backticks) in this exact format:
{
  "watering": {
    "amount_gallons": <number - gallons per watering for this plant/quantity>,
    "frequency_days": <number - how often to water>,
    "reasoning": "<brief explanation>",
    "adjustments": ["<weather-specific adjustment notes>"]
  },
  "fertilizer": {
    "type": "<recommended fertilizer>",
    "amount": "<amount per application>",
    "frequency": "<how often, e.g. 'every 2 weeks'>",
    "npk_ratio": "<recommended NPK>",
    "reasoning": "<brief explanation>"
  },
  "alerts": [
    {
      "severity": "info|warning|critical",
      "message": "<actionable alert>"
    }
  ],
  "summary": "<2-3 sentence care summary for today>"
}`;
}
