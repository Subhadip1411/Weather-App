const WEATHERAPI_KEY = 'b1c5a8e2228f4dcaa0a35035250908';
const BASE_URL = 'https://api.weatherapi.com/v1/forecast.json';

// Elements
const input = document.getElementById('locationInput');
const btn = document.getElementById('searchBtn');
const locateBtn = document.getElementById('locateBtn');
const msg = document.getElementById('message');
const place = document.getElementById('place');
const conditionText = document.getElementById('conditionText');
const tempNum = document.getElementById('tempNum');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const conditionIcon = document.getElementById('conditionIcon');
const lastUpdated = document.getElementById('lastUpdated');
const hourlyForecastEl = document.getElementById('hourlyForecast');
const dailyForecastEl = document.getElementById('dailyForecast');

let forecastData = null; 
let selectedDayIndex = 0; 

function showMessage(text, isError = true) {
  msg.textContent = text;
  msg.style.color = isError ? 'red' : 'green';
}

async function fetchWeather(query) {
  if (!query) {
    showMessage('Please enter a location.');
    return;
  }
  showMessage('Loading...', false);

  try {
    const url = `${BASE_URL}?key=${WEATHERAPI_KEY}&q=${query}&days=3&aqi=yes&alerts=no`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error fetching data');
    const data = await res.json();

    forecastData = data; 

    
    place.textContent = `${data.location.name}, ${data.location.country}`;
    conditionText.textContent = data.current.condition.text;
    tempNum.textContent = data.current.temp_c;
    feelsLike.textContent = `${data.current.feelslike_c}°C`;
    humidity.textContent = `${data.current.humidity}%`;
    wind.textContent = `${data.current.wind_kph} kph`;
    lastUpdated.textContent = `Local time: ${data.location.localtime}`;
    lastUpdated.style.display = 'block';

    conditionIcon.src = 'https:' + data.current.condition.icon;
    conditionIcon.style.display = 'block';

    
    renderDailyForecast();
    
    selectedDayIndex = 0;
    renderHourlyForecast(0);

    showMessage('Weather loaded successfully.', false);
  } catch (err) {
    console.error(err);
    showMessage('Could not load weather.');
  }
}

function renderHourlyForecast(dayIndex) {
  hourlyForecastEl.innerHTML = '';
  forecastData.forecast.forecastday[dayIndex].hour.forEach(hour => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div>${hour.time.split(' ')[1]}</div>
      <img src="https:${hour.condition.icon}" alt="">
      <div>${hour.temp_c}°C</div>
    `;
    hourlyForecastEl.appendChild(card);
  });
}

function renderDailyForecast() {
  dailyForecastEl.innerHTML = '';
  forecastData.forecast.forecastday.forEach((day, index) => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    if (index === selectedDayIndex) card.classList.add('active');
    card.innerHTML = `
      <div>${day.date}</div>
      <img src="https:${day.day.condition.icon}" alt="">
      <div>${day.day.avgtemp_c}°C</div>
    `;
    card.addEventListener('click', () => {
      selectedDayIndex = index;
      renderDailyForecast();
      renderHourlyForecast(index);
    });
    dailyForecastEl.appendChild(card);
  });
}

btn.addEventListener('click', () => fetchWeather(input.value.trim()));
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchWeather(input.value.trim());
});

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showMessage('Geolocation not supported.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
      fetchWeather(coords);
    },
    () => showMessage('Unable to retrieve your location.')
  );
});
