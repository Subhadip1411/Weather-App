
const WEATHERAPI_KEY = 'b1c5a8e2228f4dcaa0a35035250908'; 
const BASE_FORECAST = 'https://api.weatherapi.com/v1/forecast.json';
const BASE_SEARCH = 'https://api.weatherapi.com/v1/search.json';


const searchInput = document.getElementById('searchInput');
const autocompleteEl = document.getElementById('autocomplete');
const detectBtn = document.getElementById('detectBtn');
const loader = document.getElementById('loader');
const msgEl = document.getElementById('msg');
const appEl = document.getElementById('app');

const locationName = document.getElementById('locationName');
const localTime = document.getElementById('localTime');
const conditionText = document.getElementById('conditionText');
const conditionIcon = document.getElementById('conditionIcon');
const tempC = document.getElementById('tempC');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const dailyContainer = document.getElementById('dailyContainer');
const hourlyContainer = document.getElementById('hourlyContainer');

const themeToggle = document.getElementById('themeToggle');

let debounceTimer = null;
let lastQuery = '';
const LS_KEY = 'smartweather_lastcity';
const LS_THEME = 'smartweather_theme';


function showLoader(on=true){
  if(on){ loader.classList.remove('hidden'); loader.setAttribute('aria-hidden','false'); }
  else { loader.classList.add('hidden'); loader.setAttribute('aria-hidden','true'); }
}
function showMsg(text=''){ msgEl.textContent = text; }
function to24Hour(timeStr){
 
  return timeStr;
}
function formatHourISO(isoStr){
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
}
function formatDateShort(isoDate){ 
  const d = new Date(isoDate);
  return d.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'});
}
function chooseBackground(condition){
  const c = condition.toLowerCase();
  if(c.includes('rain') || c.includes('drizzle') || c.includes('thunder')) return 'rainy';
  if(c.includes('snow') || c.includes('sleet') || c.includes('blizzard')) return 'snowy';
  if(c.includes('cloud') || c.includes('overcast')) return 'cloudy';
  if(c.includes('clear') || c.includes('sun') || c.includes('sunny')) return 'sunny';
  if(c.includes('night') || c.includes('mist') || c.includes('fog')) return 'night';
  return 'sunny';
}

async function fetchForecast(q){
  showMsg(''); showLoader(true);
  try{
    const url = `${BASE_FORECAST}?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(q)}&days=5&aqi=no&alerts=no`;
    const res = await fetch(url);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if(data?.error) throw new Error(data.error.message || 'API error');
    return data;
  }catch(err){
    throw err;
  }finally{ showLoader(false); }
}

async function searchAutocomplete(q){

  if(!q) return [];
  try{
    const url = `${BASE_SEARCH}?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if(!res.ok) return [];
    const data = await res.json();
    return data; // array
  }catch(e){
    return [];
  }
}

function renderCurrent(data){
  const loc = data.location;
  const cur = data.current;
  locationName.textContent = `${loc.name}, ${loc.country}`;
  localTime.textContent = `Local time • ${loc.localtime}`;
  conditionText.textContent = cur.condition.text;
  tempC.textContent = Math.round(cur.temp_c * 10) / 10;
  feelsLike.textContent = `${Math.round(cur.feelslike_c * 10) / 10}°C`;
  humidity.textContent = `${cur.humidity}%`;
  wind.textContent = `${cur.wind_kph} kph`;

  if(cur.condition?.icon){
    conditionIcon.src = cur.condition.icon.startsWith('//') ? 'https:' + cur.condition.icon : cur.condition.icon;
    conditionIcon.style.display = 'block';
    conditionIcon.alt = cur.condition.text;
  } else {
    conditionIcon.style.display = 'none';
  }


  const today = data.forecast?.forecastday?.[0];
  if(today && today.astro){
    sunriseEl.textContent = today.astro.sunrise;
    sunsetEl.textContent = today.astro.sunset;
  } else { sunriseEl.textContent='--:--'; sunsetEl.textContent='--:--'; }

  const bgClass = chooseBackground(cur.condition.text || '');
  appEl.classList.remove('sunny','rainy','cloudy','snowy','night');
  appEl.classList.add(bgClass);
}

function renderDaily(data){
  dailyContainer.innerHTML = '';
  (data.forecast?.forecastday || []).forEach(day=>{
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <h4>${formatDateShort(day.date)}</h4>
      <img src="${day.day.condition.icon.startsWith('//') ? 'https:'+day.day.condition.icon : day.day.condition.icon}" alt="${day.day.condition.text}">
      <div class="small">${day.day.condition.text}</div>
      <div style="margin-top:6px"><b>${Math.round(day.day.avgtemp_c)}°C</b></div>
      <div class="small">Max ${Math.round(day.day.maxtemp_c)}°C • Min ${Math.round(day.day.mintemp_c)}°C</div>
    `;
    dailyContainer.appendChild(card);
  });
}

function renderHourly(data){
  hourlyContainer.innerHTML = '';
  const hours = data.forecast?.forecastday?.[0]?.hour || [];
  const now = new Date();

  const remaining = hours.filter(h => new Date(h.time) >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0));

  const showHours = remaining.length ? remaining : hours.slice(0,12);

  showHours.forEach(h=>{
    const el = document.createElement('div');
    el.className = 'hour-card';
    el.innerHTML = `
      <div class="small">${new Date(h.time).toLocaleTimeString([], {hour:'numeric'})}</div>
      <img src="${h.condition.icon.startsWith('//') ? 'https:' + h.condition.icon : h.condition.icon}" alt="${h.condition.text}">
      <div style="margin-top:6px"><b>${Math.round(h.temp_c)}°C</b></div>
      <div class="small">${h.condition.text}</div>
    `;
    hourlyContainer.appendChild(el);
  });
}

async function doSearch(q, save=true){
  if(!q) return;
  try{
    showMsg('');
    const data = await fetchForecast(q);
    renderCurrent(data);
    renderDaily(data);
    renderHourly(data);
    if(save) localStorage.setItem(LS_KEY, q);
  }catch(err){
    console.error(err);
    showMsg(err.message || 'Could not load weather. Try another city.');
  }
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearTimeout(debounceTimer);
  if(!q){ autocompleteEl.hidden=true; return; }
  debounceTimer = setTimeout(async ()=>{
    const results = await searchAutocomplete(q);
    autocompleteEl.innerHTML = '';
    if(results && results.length){
      results.forEach(r=>{
        const item = document.createElement('div');
        item.className = 'item';
        item.tabIndex = 0;
        item.textContent = `${r.name}, ${r.region || r.country || ''}`;
        item.addEventListener('click', ()=> { searchInput.value = r.name; autocompleteEl.hidden=true; doSearch(r.name); });
        item.addEventListener('keydown', (e)=>{ if(e.key==='Enter') { item.click(); }});
        autocompleteEl.appendChild(item);
      });
      autocompleteEl.hidden = false;
    } else {
      autocompleteEl.hidden = true;
    }
  }, 350); 
});


document.addEventListener('click', (e)=>{
  if(!document.querySelector('.search-wrap')?.contains(e.target)) autocompleteEl.hidden = true;
});


searchInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    const q = searchInput.value.trim();
    if(q){ autocompleteEl.hidden=true; doSearch(q); }
  }
});

detectBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){ showMsg('Geolocation not supported'); return; }
  showLoader(true); showMsg('');
  navigator.geolocation.getCurrentPosition(async pos=>{
    const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
    showLoader(false);
    await doSearch(coords);
  }, err=>{
    showLoader(false);
    showMsg('Location denied — please search manually.');
  }, {timeout:8000});
});


function applyTheme(theme){
  if(theme === 'dark'){ document.body.classList.add('dark'); themeToggle.textContent = '☀️'; }
  else { document.body.classList.remove('dark'); themeToggle.textContent = '🌙'; }
  localStorage.setItem(LS_THEME, theme);
}
themeToggle.addEventListener('click', ()=>{
  const cur = localStorage.getItem(LS_THEME) || 'light';
  const next = cur === 'light' ? 'dark' : 'light';
  applyTheme(next);
});

window.addEventListener('load', async ()=>{
  
  const savedTheme = localStorage.getItem(LS_THEME) || 'light';
  applyTheme(savedTheme);

  const last = localStorage.getItem(LS_KEY);
  if(last){
    searchInput.value = last;
    doSearch(last,false);
    return;
  }

 
  if(navigator.geolocation){
    try{
      showLoader(true);
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(async pos=>{
          const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
          await doSearch(coords,false);
          showLoader(false);
          resolve();
        }, err=>{
          showLoader(false);
          
          const fallback = 'London';
          searchInput.value = fallback;
          doSearch(fallback,false);
          resolve();
        }, {timeout:7000});
      });
    }catch(e){
      showLoader(false);
      const fallback = 'London';
      searchInput.value = fallback;
      doSearch(fallback,false);
    }
  } else {
    const fallback = 'London';
    searchInput.value = fallback;
    doSearch(fallback,false);
  }
});
