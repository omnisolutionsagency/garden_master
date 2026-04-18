import { WeatherData } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

interface OwmCurrent {
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: Array<{ main: string; description: string }>;
  wind: { speed: number };
  rain?: { '1h'?: number; '3h'?: number };
}

interface OwmForecastEntry {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: Array<{ main: string }>;
  rain?: { '3h'?: number };
  dt_txt: string;
}

interface OwmForecast {
  list: OwmForecastEntry[];
}

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  if (!API_KEY) {
    throw new Error('Missing OpenWeatherMap API key (EXPO_PUBLIC_OPENWEATHERMAP_API_KEY).');
  }

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`),
    fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`),
  ]);

  if (!currentRes.ok) {
    const body = await currentRes.text();
    throw new Error(`Weather API error ${currentRes.status}: ${body.slice(0, 200)}`);
  }
  if (!forecastRes.ok) {
    const body = await forecastRes.text();
    throw new Error(`Forecast API error ${forecastRes.status}: ${body.slice(0, 200)}`);
  }

  const current: OwmCurrent = await currentRes.json();
  const forecast: OwmForecast = await forecastRes.json();

  const currentRainMm = current.rain?.['1h'] ?? current.rain?.['3h'] ?? 0;

  const daily = aggregateDaily(forecast.list);
  const today = daily[0] ?? {
    date: new Date().toISOString().split('T')[0],
    high_f: Math.round(current.main.temp_max),
    low_f: Math.round(current.main.temp_min),
    rainfall_inches: parseFloat((currentRainMm / 25.4).toFixed(2)),
    conditions: current.weather[0]?.main || 'Unknown',
    humidity: current.main.humidity,
  };

  return {
    current: {
      temp_f: Math.round(current.main.temp),
      humidity: current.main.humidity,
      conditions: current.weather[0]?.main || 'Unknown',
      wind_mph: Math.round(current.wind.speed),
      uv_index: 0,
    },
    today: {
      high_f: today.high_f,
      low_f: today.low_f,
      rainfall_inches: today.rainfall_inches,
    },
    forecast: daily.slice(0, 7),
  };
}

function aggregateDaily(entries: OwmForecastEntry[]): WeatherData['forecast'] {
  const byDate = new Map<
    string,
    { highs: number[]; lows: number[]; rainMm: number; conditions: string[]; humidity: number[] }
  >();

  for (const entry of entries) {
    const date = entry.dt_txt.split(' ')[0];
    const bucket =
      byDate.get(date) ||
      { highs: [], lows: [], rainMm: 0, conditions: [], humidity: [] };
    bucket.highs.push(entry.main.temp_max);
    bucket.lows.push(entry.main.temp_min);
    bucket.rainMm += entry.rain?.['3h'] ?? 0;
    bucket.conditions.push(entry.weather[0]?.main || 'Unknown');
    bucket.humidity.push(entry.main.humidity);
    byDate.set(date, bucket);
  }

  return Array.from(byDate.entries()).map(([date, b]) => ({
    date,
    high_f: Math.round(Math.max(...b.highs)),
    low_f: Math.round(Math.min(...b.lows)),
    rainfall_inches: parseFloat((b.rainMm / 25.4).toFixed(2)),
    conditions: mode(b.conditions),
    humidity: Math.round(b.humidity.reduce((s, h) => s + h, 0) / b.humidity.length),
  }));
}

function mode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = values[0] || 'Unknown';
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/**
 * Get total rainfall over the past N days. Historical data isn't available on
 * the free tier, so we return 0 and rely on the forecast rainfall instead.
 */
export async function getRecentRainfall(
  _lat: number,
  _lon: number,
  _days: number = 3
): Promise<number> {
  return 0;
}

export function checkFrostRisk(forecast: WeatherData['forecast']): boolean {
  return forecast.some((day) => day.low_f <= 35);
}

/**
 * Estimate evapotranspiration rate (simplified Hargreaves)
 * Returns inches/day of water loss
 */
export function estimateET(highF: number, lowF: number, dayOfYear: number): number {
  const avgF = (highF + lowF) / 2;
  const range = highF - lowF;
  const ra = 15 + 10 * Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI);
  const etMm = 0.0023 * (avgF + 17.8) * Math.sqrt(range) * ra * 0.408;
  return parseFloat((etMm / 25.4).toFixed(3));
}
