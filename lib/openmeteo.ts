// Open-Meteo helpers — same logic as v3.1, now typed

export interface WeatherCodeInfo {
  label: string;
  icon: string; // Tabler icon class, e.g. 'ti-sun'
}

export function weatherCodeInfo(code: number): WeatherCodeInfo {
  if (code === 0)  return { label: 'Clear sky',     icon: 'ti-sun'        };
  if (code <= 3)   return { label: 'Partly cloudy', icon: 'ti-cloud'      };
  if (code <= 48)  return { label: 'Foggy',         icon: 'ti-cloud-fog'  };
  if (code <= 57)  return { label: 'Drizzle',       icon: 'ti-cloud-rain' };
  if (code <= 67)  return { label: 'Rain',          icon: 'ti-cloud-rain' };
  if (code <= 77)  return { label: 'Snow',          icon: 'ti-cloud-snow' };
  if (code <= 82)  return { label: 'Rain showers',  icon: 'ti-cloud-storm'};
  if (code <= 86)  return { label: 'Snow showers',  icon: 'ti-cloud-snow' };
  if (code <= 99)  return { label: 'Thunderstorm',  icon: 'ti-bolt'       };
  return { label: 'Unknown', icon: 'ti-cloud' };
}

export const TITISEE_LAT = 47.898;
export const TITISEE_LNG = 8.156;

export const OPEN_METEO_URL =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${TITISEE_LAT}&longitude=${TITISEE_LNG}` +
  `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max` +
  `&timezone=Europe%2FBerlin&forecast_days=5`;

export interface CurrentWeather {
  temp: number;
  humidity: number;
  weatherCode: number;
  windKmh: number;
  uvIndex: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainProbability: number;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  fetchedAt: string;
}

export async function fetchWeather(): Promise<WeatherData> {
  const res = await fetch(OPEN_METEO_URL, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const json = await res.json();

  return {
    current: {
      temp: Math.round(json.current.temperature_2m),
      humidity: Math.round(json.current.relative_humidity_2m),
      weatherCode: json.current.weather_code,
      windKmh: Math.round(json.current.wind_speed_10m),
      uvIndex: Math.round((json.current.uv_index ?? json.daily.uv_index_max[0] ?? 0) * 10) / 10,
    },
    daily: json.daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: json.daily.weather_code[i],
      tempMax: Math.round(json.daily.temperature_2m_max[i]),
      tempMin: Math.round(json.daily.temperature_2m_min[i]),
      rainProbability: Math.round(json.daily.precipitation_probability_max[i] ?? 0),
    })),
    fetchedAt: new Date().toISOString(),
  };
}
