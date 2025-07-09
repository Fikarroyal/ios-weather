const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // GANTI DENGAN API KEY ANDA!
const CITY_NAME = 'YOUR CITY'; // Sudah diatur ke Yogyakarta, Indonesia

const locationElement = document.querySelector('.location');
const temperatureElement = document.querySelector('.temperature');
const conditionElement = document.querySelector('.condition');
const highLowElement = document.querySelector('.high-low');
const hourlyScroll = document.querySelector('.hourly-scroll');
const dailyForecast = document.querySelector('.daily-forecast');
const uvIndexElement = document.getElementById('uv-index');
const windSpeedElement = document.getElementById('wind-speed');
const humidityElement = document.getElementById('humidity');
const visibilityElement = document.getElementById('visibility');
const backgroundOverlay = document.querySelector('.background-overlay');

// Fungsi untuk menampilkan pesan loading
function showLoadingState() {
    locationElement.textContent = "Memuat...";
    temperatureElement.textContent = "--°";
    conditionElement.textContent = "Memuat data cuaca";
    highLowElement.textContent = "";

    hourlyScroll.innerHTML = `<p class="loading-message">Memuat perkiraan jam-an...</p>`;
    dailyForecast.innerHTML = `<h3 style="margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.12);">Perkiraan Harian</h3><p class="loading-message">Memuat perkiraan harian...</p>`;
    uvIndexElement.textContent = '--';
    windSpeedElement.textContent = '-- km/h';
    humidityElement.textContent = '--%';
    visibilityElement.textContent = '-- km';
    // Set default background saat loading
    backgroundOverlay.style.background = 'linear-gradient(to bottom, #1E293B, #334155)'; 
}

// Fungsi untuk mendapatkan data cuaca
async function getWeatherData() {
    showLoadingState(); // Tampilkan loading state saat mulai fetch data
    try {
        // Cuaca Saat Ini (Current Weather)
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CITY_NAME}&appid=${API_KEY}&units=metric&lang=id`;
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();

        if (currentData.cod !== 200) {
            throw new Error(currentData.message || 'Gagal mengambil data cuaca saat ini.');
        }

        // Perkiraan (Forecast - 5 hari / 3 jam)
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${CITY_NAME}&appid=${API_KEY}&units=metric&lang=id`;
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        if (forecastData.cod !== '200') { 
            throw new Error(forecastData.message || 'Gagal mengambil data perkiraan cuaca.');
        }

        updateUI(currentData, forecastData);

    } catch (error) {
        console.error("Error fetching weather data:", error);
        locationElement.textContent = "Error";
        temperatureElement.textContent = "--°";
        conditionElement.textContent = "Tidak dapat memuat cuaca";
        highLowElement.textContent = "";
        hourlyScroll.innerHTML = `<p class="loading-message">Gagal memuat perkiraan jam-an.</p>`;
        dailyForecast.innerHTML = `<h3 style="margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.12);">Perkiraan Harian</h3><p class="loading-message">Gagal memuat perkiraan harian.</p>`;
        uvIndexElement.textContent = '--';
        windSpeedElement.textContent = '-- km/h';
        humidityElement.textContent = '--%';
        visibilityElement.textContent = '-- km';
        // Set background error
        backgroundOverlay.style.background = 'linear-gradient(to bottom, #CC3300, #FF6633)'; // Merah oranye untuk error
    }
}

// Fungsi untuk memperbarui UI
function updateUI(currentData, forecastData) {
    // --- Data Cuaca Saat Ini ---
    locationElement.textContent = currentData.name;
    temperatureElement.textContent = `${Math.round(currentData.main.temp)}°`;
    conditionElement.textContent = capitalizeFirstLetter(currentData.weather[0].description);
    highLowElement.textContent = `H: ${Math.round(currentData.main.temp_max)}° L: ${Math.round(currentData.main.temp_min)}°`;

    // --- Background Dinamis (sederhana) ---
    const weatherId = currentData.weather[0].id; 
    const isDay = (currentData.dt > currentData.sys.sunrise && currentData.dt < currentData.sys.sunset);
    setDynamicBackground(weatherId, isDay);

    // --- Perkiraan Jam-an ---
    hourlyScroll.innerHTML = ''; // Hapus pesan loading
    const now = new Date();
    const filteredHourly = forecastData.list.filter(item => {
        const itemDate = new Date(item.dt * 1000);
        return itemDate.getTime() > now.getTime(); 
    }).slice(0, 8); 

    filteredHourly.forEach((item, index) => {
        const date = new Date(item.dt * 1000); 
        const hour = date.getHours();
        const timeText = index === 0 ? 'Sekarang' : `${hour}:00`; 

        const iconCode = item.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        const hourlyItem = document.createElement('div');
        hourlyItem.classList.add('hourly-item');
        hourlyItem.innerHTML = `
            <p class="time">${timeText}</p>
            <img src="${iconUrl}" alt="${item.weather[0].description}">
            <p class="temp">${Math.round(item.main.temp)}°</p>
        `;
        hourlyScroll.appendChild(hourlyItem);
    });

    // --- Perkiraan Harian ---
    dailyForecast.innerHTML = '<h3 style="margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.12);">Perkiraan Harian</h3>'; // Hapus pesan loading dan tambahkan judul kembali
    const dailyData = {}; 

    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toDateString(); 
        if (!dailyData[day]) {
            dailyData[day] = {
                temps: [],
                icon: item.weather[0].icon 
            };
        }
        dailyData[day].temps.push(item.main.temp);
    });

    const todayDateString = new Date(currentData.dt * 1000).toDateString();
    let dailyCounter = 0; 

    for (const dayString in dailyData) {
        if (dailyCounter >= 5) break; 
        
        const temps = dailyData[dayString].temps;
        const minTemp = Math.round(Math.min(...temps));
        const maxTemp = Math.round(Math.max(...temps));
        const iconCode = dailyData[dayString].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        const dayName = (dayString === todayDateString) ? 'Hari Ini' : getDayOfWeek(dayString);

        const dailyItem = document.createElement('div');
        dailyItem.classList.add('daily-item');
        dailyItem.innerHTML = `
            <p class="day">${dayName}</p>
            <div class="icon"><img src="${iconUrl}" alt=""></div>
            <p class="low-temp">${minTemp}°</p>
            <p class="high-temp">${maxTemp}°</p>
        `;
        dailyForecast.appendChild(dailyItem);
        dailyCounter++;
    }

    // --- Detail Tambahan ---
    uvIndexElement.textContent = currentData.uvi !== undefined ? Math.round(currentData.uvi) : '--'; 
    windSpeedElement.textContent = `${Math.round(currentData.wind.speed * 3.6)} km/h`; 
    humidityElement.textContent = `${currentData.main.humidity}%`;
    visibilityElement.textContent = `${(currentData.visibility / 1000).toFixed(1)} km`; 
}


// --- Fungsi Pembantu (tidak berubah) ---

function setDynamicBackground(weatherId, isDay) {
    let gradient;
    if (isDay) {
        if (weatherId >= 200 && weatherId < 600) { 
            gradient = 'linear-gradient(to bottom, #4B5563, #6B7280)'; 
        } else if (weatherId >= 600 && weatherId < 700) { 
            gradient = 'linear-gradient(to bottom, #A7B0BF, #D1D5DB)'; 
        } else if (weatherId === 800) { 
            gradient = 'linear-gradient(to bottom, #4A90E2, #8BC6EC)'; 
        } else if (weatherId >= 801 && weatherId < 900) { 
            gradient = 'linear-gradient(to bottom, #7C7C7C, #A0A0A0)'; 
        } else { 
            gradient = 'linear-gradient(to bottom, #1E3A8A, #60A5FA)';
        }
    } else { 
        if (weatherId >= 200 && weatherId < 600) { 
            gradient = 'linear-gradient(to bottom, #1A202C, #2D3748)'; 
        } else if (weatherId === 800) { 
            gradient = 'linear-gradient(to bottom, #101520, #252A40)'; 
        } else { 
            gradient = 'linear-gradient(to bottom, #2D3748, #4A5568)'; 
        }
    }
    backgroundOverlay.style.background = gradient;
}


function getDayOfWeek(dateString) {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Panggil fungsi utama saat halaman dimuat
getWeatherData();

// Refresh data setiap 30 menit (opsional, hati-hati dengan batasan API)
// setInterval(getWeatherData, 30 * 60 * 1000);