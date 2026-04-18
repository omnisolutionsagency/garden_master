import { WeatherData } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/3.0';

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `${BASE_URL}/onecall?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`);
  }

  const data = await res.json();

  return {
    current: {
      temp_f: Math.round(data.current.temp),
      humidity: data.current.humidity,
      conditions: data.current.weather[0]?.main || 'Unknown',
      wind_mph: Math.round(data.current.wind_speed),
      uv_index: data.current.uvi,
    },
    today: {
      high_f: Math.round(data.daily[0].temp.max),
      low_f: Math.round(data.daily[0].temp.min),
      rainfall_inches: (data.daily[0].rain || 0) / 25.4, // mm to inches
    },
    forecast: data.daily.slice(0, 7).map((day: any) => ({
      date: new Date(day.dt * 1000).toISOString().split('T')[0],
      high_f: Math.round(day.temp.max),
      low_f: Math.round(day.temp.min),
      rainfall_inches: parseFloat(((day.rain || 0) / 25.4).toFixed(2)),
      conditions: day.weather[0]?.main || 'Unknown',
      humidity: day.humidity,
    })),
  };
}

/**
 * Get total rainfall over the past N days from weather history.
 * Useful for determining if plants have already been watered by rain.
 */
export async function getRecentRainfall(
  lat: number,
  lon: number,
  days: number = 3
): Promise<number> {
  let totalInches = 0;

  for (let i = 1; i <= days; i++) {
    const dt = Math.floor(Date.now() / 1000) - i * 86400;
    const url = `${BASE_URL}/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${dt}&units=imperial&appid=${API_KEY}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const rain = data.data?.[0]?.rain?.['1h'] || 0;
        totalInches += rain / 25.4;
      }
    } catch {
      // Skip failed day
    }
  }

  return parseFloat(totalInches.toFixed(2));
}

/**
 * Simple frost alert check
 */
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
  // Simplified - real ET calc would include solar radiation
  const ra = 15 + 10 * Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI); // approx MJ/m2/day
  const etMm = 0.0023 * (avgF + 17.8) * Math.sqrt(range) * ra * 0.408;
  return parseFloat((etMm / 25.4).toFixed(3)); // convert mm to inches
}
