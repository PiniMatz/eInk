const defaultWeather = {
  temp: 24,
  tempMin: 21,
  tempMax: 28,
  description: 'בהיר',
  city: 'פרדסיה',
  icon: '01d',
  sunrise: '05:42',
  sunset: '19:48',
  forecast: Array(7).fill({ tempMin: 21, tempMax: 28, icon: '01d' })
};

function translateWeatherCode(code) {
  if (code === 0) return 'בהיר';
  if (code >= 1 && code <= 3) return 'מעונן חלקית';
  if (code === 45 || code === 48) return 'ערפילי';
  if (code >= 51 && code <= 55) return 'טפטוף';
  if (code >= 61 && code <= 65) return 'גשם';
  if (code >= 71 && code <= 75) return 'שלג';
  if (code >= 80 && code <= 82) return 'ממטרים';
  if (code >= 95 && code <= 99) return 'סופת רעמים';
  return 'בהיר';
}

function getWeatherIconCode(code) {
  if (code === 0) return '01d';
  if (code >= 1 && code <= 3) return '02d';
  if (code === 45 || code === 48) return '50d';
  if (code >= 51 && code <= 55) return '09d';
  if (code >= 61 && code <= 65) return '10d';
  if (code >= 71 && code <= 75) return '13d';
  if (code >= 80 && code <= 82) return '09d';
  if (code >= 95 && code <= 99) return '11d';
  return '01d';
}

async function getWeather() {
  // Always query Pardesiya coordinates (lat=32.228, lon=34.912)
  const lat = '32.228';
  const lon = '34.912';
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weather_code&timezone=Asia%2FJerusalem&past_days=1&forecast_days=6`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse Sunrise/Sunset times for Today (index 1 when past_days=1)
    const sunriseStr = data.daily.sunrise[1] ? data.daily.sunrise[1].split('T')[1] : '05:42';
    const sunsetStr = data.daily.sunset[1] ? data.daily.sunset[1].split('T')[1] : '19:48';
    
    // Map 7 days of forecast (index 0 is yesterday, 1 is today, etc.)
    const forecast = data.daily.time.map((time, idx) => ({
      tempMin: Math.round(data.daily.temperature_2m_min[idx]),
      tempMax: Math.round(data.daily.temperature_2m_max[idx]),
      icon: getWeatherIconCode(data.daily.weather_code[idx])
    }));
    
    return {
      temp: data.current.temperature_2m,
      tempMin: data.daily.temperature_2m_min[1],
      tempMax: data.daily.temperature_2m_max[1],
      description: translateWeatherCode(data.current.weather_code),
      city: 'פרדסיה',
      icon: getWeatherIconCode(data.current.weather_code),
      sunrise: sunriseStr,
      sunset: sunsetStr,
      forecast
    };
  } catch (err) {
    console.error('Error fetching weather from Open-Meteo:', err.message);
    return defaultWeather;
  }
}

module.exports = { getWeather };
