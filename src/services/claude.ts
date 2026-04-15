import { supabase } from './supabase';
import { Plant, WeatherData, WateringLog, FertilizerLog, AiRecommendation, Garden } from '../types';

interface AnalysisInput {
  garden: Garden;
  plant: Plant;
  weather: WeatherData;
  recentWatering: WateringLog[];
  recentFertilizer: FertilizerLog[];
}

/**
 * Call the Supabase Edge Function which proxies to Claude API.
 * Keeps the Anthropic API key server-side.
 */
export async function analyzeGardenPlant(input: AnalysisInput): Promise<AiRecommendation> {
  const prompt = buildPrompt(input);

  const { data, error } = await supabase.functions.invoke('analyze-garden', {
    body: {
      prompt,
      plant_id: input.plant.id,
      garden_id: input.garden.id,
      analysis_type: 'watering',
    },
  });

  if (error) throw new Error(`AI analysis failed: ${error.message}`);
  return data.recommendation as AiRecommendation;
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
