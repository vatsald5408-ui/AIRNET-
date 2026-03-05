/* ===================================================
   AirNet — app.js
   All 5 intelligence systems: charts, animations, data
   Green ecosystem color palette throughout
   =================================================== */

// ── Accent color constants ───────────────────────────────
const C = {
  accent: '#38BDF8',
  accentDim: 'rgba(56,189,248,0.12)',
  good: '#22C55E',
  moderate: '#FFB547',
  poor: '#FF8C42',
  vp: '#FF4D4D',
  severe: '#C026D3',
  grid: 'rgba(56,189,248,0.04)',
  bg: '#080C10',
  card: '#131C2B',
  surface: '#0E1520',
  tooltip: '#0E1520',
};

// ── Centralised config — all tunable constants in one place ──
// Edit these to adjust model behaviour without hunting literals
const AIRNET_CONFIG = {
  spike: {
    windFactor: 1.2,  // km/h-to-suppression multiplier
    windCap: 15,   // max spike suppression from wind
    cascadeBoost: 8,    // extra spike % for cascade zones
    rushBoost: 6,    // extra spike % during peak hours
  },
  rushHours: { morningStart: 7, morningEnd: 10, eveningStart: 17, eveningEnd: 21 },
  asi: { aqiWeight: 0.40, stressWeight: 0.20, spikeWeight: 0.20, vulnWeight: 0.20 },
  aqi: { ceiling: 500 },
  // Risk countdown: how many base seconds to count down from, varying by AQI bracket
  countdownHours: { low: 24, moderate: 18, poor: 12, veryPoor: 8 },
  riskDensity: { maxZones: 36 },
};

// ── API Endpoints — single source of truth for all external URLs ──
// Mirror of config/apis.js for the browser (no require() available)
const AIRNET_APIS = {
  waqi: { base: 'https://api.waqi.info' },
  gemini: { base: 'https://generativelanguage.googleapis.com/v1beta/models' },
  meteoAQ: { base: 'https://air-quality-api.open-meteo.com/v1/air-quality' },
  meteoWx: { base: 'https://api.open-meteo.com/v1/forecast' },
  overpass: { base: 'https://overpass-api.de/api/interpreter' },
  carto: { style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  airnet: { base: '/api/v1' },
};

// ── Shared State ────────────────────────────────────────
// ── Shared State ────────────────────────────────────────
let zones = [
  { name: 'Anand Vihar', lng: 77.3061, lat: 28.6468, aqi: 312, stress: 88, spike: 84, source: 'Traffic', vuln: 79, cascade: true },
  { name: 'Rohini', lng: 77.1130, lat: 28.7033, aqi: 278, stress: 74, spike: 71, source: 'Industry', vuln: 62, cascade: false },
  { name: 'Punjabi Bagh', lng: 77.1265, lat: 28.6678, aqi: 255, stress: 72, spike: 68, source: 'Traffic', vuln: 55, cascade: true },
  { name: 'RK Puram', lng: 77.1705, lat: 28.5660, aqi: 198, stress: 55, spike: 52, source: 'Construction', vuln: 48, cascade: false },
  { name: 'Dwarka', lng: 77.0500, lat: 28.5900, aqi: 210, stress: 60, spike: 58, source: 'Traffic', vuln: 51, cascade: false },
  { name: 'Okhla', lng: 77.2900, lat: 28.5600, aqi: 289, stress: 79, spike: 76, source: 'Industry', vuln: 73, cascade: true },
  { name: 'Lodhi Road', lng: 77.2215, lat: 28.5885, aqi: 164, stress: 44, spike: 40, source: 'Traffic', vuln: 38, cascade: false },
  { name: 'Jahangirpuri', lng: 77.1600, lat: 28.7200, aqi: 301, stress: 83, spike: 79, source: 'Industry', vuln: 71, cascade: true },
  { name: 'Bawana', lng: 77.0300, lat: 28.7900, aqi: 334, stress: 91, spike: 87, source: 'Industry', vuln: 84, cascade: true },
  { name: 'Mundka', lng: 77.0200, lat: 28.6800, aqi: 296, stress: 81, spike: 77, source: 'Industry', vuln: 68, cascade: true },
  { name: 'Mandir Marg', lng: 77.2000, lat: 28.6300, aqi: 183, stress: 50, spike: 47, source: 'Traffic', vuln: 42, cascade: false },
  { name: 'Shahdara', lng: 77.2900, lat: 28.6700, aqi: 271, stress: 74, spike: 69, source: 'Traffic', vuln: 64, cascade: false },
  { name: 'Najafgarh', lng: 76.9800, lat: 28.6100, aqi: 224, stress: 62, spike: 59, source: 'External', vuln: 45, cascade: false },
  { name: 'Faridabad Bdr', lng: 77.3200, lat: 28.4800, aqi: 308, stress: 86, spike: 82, source: 'Industry', vuln: 76, cascade: true },
  { name: 'Noida Bdr', lng: 77.3000, lat: 28.5700, aqi: 267, stress: 71, spike: 66, source: 'Construction', vuln: 60, cascade: false },
  { name: 'North Campus', lng: 77.2100, lat: 28.6900, aqi: 244, stress: 66, spike: 62, source: 'Traffic', vuln: 54, cascade: false },
  { name: 'Vasundhara', lng: 77.3500, lat: 28.6600, aqi: 288, stress: 78, spike: 74, source: 'Industry', vuln: 67, cascade: true },
  { name: 'Saket', lng: 77.2000, lat: 28.5200, aqi: 192, stress: 53, spike: 50, source: 'Traffic', vuln: 44, cascade: false },
  { name: 'Pitampura', lng: 77.1300, lat: 28.7000, aqi: 263, stress: 71, spike: 67, source: 'Traffic', vuln: 58, cascade: false },
  { name: 'East Delhi Hub', lng: 77.2800, lat: 28.6400, aqi: 295, stress: 80, spike: 76, source: 'Industry', vuln: 70, cascade: true },
  { name: 'Mayur Vihar', lng: 77.2900, lat: 28.6100, aqi: 280, stress: 76, spike: 72, source: 'Traffic', vuln: 65, cascade: false },
  { name: 'Kalkaji', lng: 77.2500, lat: 28.5400, aqi: 242, stress: 65, spike: 61, source: 'Construction', vuln: 56, cascade: false },
  { name: 'Paschim Vihar', lng: 77.1000, lat: 28.6700, aqi: 267, stress: 72, spike: 68, source: 'Industry', vuln: 60, cascade: false },
  { name: 'Timarpur', lng: 77.2200, lat: 28.7000, aqi: 291, stress: 79, spike: 75, source: 'Industry', vuln: 66, cascade: true },
];

function applyLiveData() {
  if (window.__LIVE_ZONE_DATA__ && window.__LIVE_ZONE_DATA__.length) {
    console.log(`[AIRNET] Completely replacing dashboard state with ${window.__LIVE_ZONE_DATA__.length} live NCR stations...`);
    // Completely overwrite the hardcoded zones array with the authentic WAQI stations
    if (window.__LIVE_ZONE_DATA__.length > 0) {
      zones = window.__LIVE_ZONE_DATA__;
      if (typeof populateForecastZoneSelector === 'function') populateForecastZoneSelector();
    }

    // Update map if initialized
    if (window._airnetMap && window._airnetMap.getSource('aqi-source')) {
      const getGeoJSON = () => ({
        type: 'FeatureCollection',
        features: zones.map((z, i) => ({
          type: 'Feature',
          id: i,
          properties: { ...z },
          geometry: { type: 'Point', coordinates: [z.lng, z.lat] }
        }))
      });
      window._airnetMap.getSource('aqi-source').setData(getGeoJSON());
    }

    // System 3 Updates
    if (typeof window.initSystem3GlobalSelector === 'function') {
      window.initSystem3GlobalSelector();
    }

    // System 4 Updates
    if (typeof window.populateSys4Dropdown === 'function') {
      window.populateSys4Dropdown();
    }
    if (window._s4MapBefore && typeof window.updateMapDataSys4 === 'function') {
      window.updateMapDataSys4();
    }

    // System 5 Updates
    if (typeof window.populateSys5Dropdown === 'function') {
      window.populateSys5Dropdown();
    }

    updateGlobalMetrics();
    if (typeof window.updateDynamicSubsystems === 'function') {
      window.updateDynamicSubsystems();
    }
  }
}
window.applyAIRNETLiveData = applyLiveData;

// ── Shared spike score helper (used by Tab1 metric, ASI gauge & Tab2 engine)
function calcSpikeScore(zone) {
  const windSpeed = (window.__LIVE_WIND__ && window.__LIVE_WIND__.speed) ? window.__LIVE_WIND__.speed : 5;
  const windSuppression = Math.min(
    AIRNET_CONFIG.spike.windCap,
    Math.round(windSpeed * AIRNET_CONFIG.spike.windFactor)
  );
  const cascadeBoost = zone.cascade ? AIRNET_CONFIG.spike.cascadeBoost : 0;
  const nowHour = new Date().getHours();
  const isRushHour = (nowHour >= AIRNET_CONFIG.rushHours.morningStart && nowHour <= AIRNET_CONFIG.rushHours.morningEnd)
    || (nowHour >= AIRNET_CONFIG.rushHours.eveningStart && nowHour <= AIRNET_CONFIG.rushHours.eveningEnd);
  const rushBoost = isRushHour ? AIRNET_CONFIG.spike.rushBoost : 0;
  return Math.min(100, Math.max(0, Math.round((zone.spike || 0) - windSuppression + cascadeBoost + rushBoost)));
}

function updateGlobalMetrics() {
  const avgAQI = Math.round(zones.reduce((s, z) => s + z.aqi, 0) / zones.length);
  const mostStressed = zones.reduce((prev, curr) => (prev.aqi > curr.aqi) ? prev : curr);
  // Use derived spike score (same formula as ASI gauge & Spike Probability Engine)
  const avgSpike = Math.round(zones.reduce((s, z) => s + calcSpikeScore(z), 0) / zones.length);

  const cityAvgAQI = document.getElementById('cityAvgAQI');
  if (cityAvgAQI) {
    cityAvgAQI.textContent = avgAQI;
    // Set color based on value
    if (avgAQI <= 50) cityAvgAQI.className = 'metric-value aqi-good';
    else if (avgAQI <= 200) cityAvgAQI.className = 'metric-value aqi-moderate';
    else cityAvgAQI.className = 'metric-value aqi-poor';
  }

  const stressedZone = document.getElementById('stressedZone');
  if (stressedZone) stressedZone.textContent = mostStressed.name;

  const spikePctEl = document.getElementById('spikePct');
  if (spikePctEl) spikePctEl.textContent = avgSpike + '%';

  const activeZonesCount = document.getElementById('activeZonesCount');
  if (activeZonesCount) activeZonesCount.textContent = zones.length;

  // Keep the map overlay in sync with the same zone count
  const mapStressCount = document.getElementById('mapStressCount');
  if (mapStressCount) mapStressCount.textContent = zones.length;
  const riskDensityFill = document.getElementById('riskDensityFill');
  if (riskDensityFill) riskDensityFill.style.width = Math.min(100, Math.round((zones.length / 36) * 100)) + '%';

  // Update Live Wind Speed
  const avgWindSpeed = document.getElementById('avgWindSpeed');
  if (avgWindSpeed) {
    if (window.__LIVE_WIND__ && window.__LIVE_WIND__.speed) {
      // Convert bearing to standard ordinal arrows
      const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
      const dir = window.__LIVE_WIND__.direction;
      const index = Math.round(dir / 45) % 8;
      const arrow = arrows[index];

      avgWindSpeed.innerHTML = `${window.__LIVE_WIND__.speed.toFixed(1)} km/h <span style="color:var(--accent)">${arrow}</span>`;
    } else {
      avgWindSpeed.innerHTML = `Loading...`;
    }
  }

  // Ensure the ASI Gauge also syncs up with the newest data
  if (typeof window.updateASIComponents === 'function') {
    window.updateASIComponents(mostStressed);
  }
}
updateGlobalMetrics();

// Keep global metrics auto-refreshing in case there's a slow API load or race condition
// removed overly aggressive setInterval that causes chart flicker
// setInterval(updateGlobalMetrics, 3000);

// ── Live Clock ──────────────────────────────────────────
function updateClock() {
  const t = new Date();
  const el = document.getElementById('liveTime');
  if (el) el.textContent = t.toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ── Nav ─────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.system-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panelId = 'system' + btn.dataset.system;
      const targetPanel = document.getElementById(panelId);
      if (targetPanel) targetPanel.classList.add('active');

      // Trigger map resize to fix initialization in hidden containers
      if (btn.dataset.system === '1' && window._airnetMap) {
        setTimeout(() => window._airnetMap.resize(), 100);
      } else if (btn.dataset.system === '3' && window.trajMapInstance) {
        setTimeout(() => window.trajMapInstance.resize(), 100);
      } else if (btn.dataset.system === '4' && window._s4MapBefore && window._s4MapAfter) {
        setTimeout(() => {
          window._s4MapBefore.resize();
          window._s4MapAfter.resize();
        }, 100);
      }

      // Close mobile menu if open
      const header = document.querySelector('.header');
      if (header) header.classList.remove('nav-open');
    });
  });
}
initNav(); // Also call it immediately for static initialization

// ── Ctrl btn toggles ────────────────────────────────────
document.querySelectorAll('.panel-controls').forEach(grp => {
  grp.querySelectorAll('.ctrl-btn').forEach(b => {
    b.addEventListener('click', () => {
      grp.querySelectorAll('.ctrl-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
});

// ══════════════════════════════════════════════════════════
// SYSTEM 1 — LIVE ATMOSPHERIC VIEW
// ══════════════════════════════════════════════════════════

// ── Delhi AQI Map — Atmospheric Command Surface ──────────
// ── Delhi AQI Map — Professional Geospatial Intelligence ──────────
(function () {
  const mapContainer = document.getElementById('delhiMap');
  if (!mapContainer) return;

  // Initialize MapLibre
  const map = new maplibregl.Map({
    container: 'delhiMap',
    style: AIRNET_APIS.carto.style,
    center: [77.16, 28.62],
    zoom: 10.3,
    pitch: 45,
    bearing: -15,
    antialias: true
  });
  window._airnetMap = map;

  // Premium hover tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'map-premium-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-header"><span class="tooltip-title" id="mttName">Zone</span></div>
    <div class="tooltip-stats">
      <div class="tooltip-stat-item"><span class="ts-label">AQI</span><span class="ts-value" id="mttAQI">--</span></div>
      <div class="tooltip-stat-item"><span class="ts-label">Stress</span><span class="ts-value" id="mttStress">--</span></div>
      <div class="tooltip-stat-item"><span class="ts-label">Spike Prob</span><span class="ts-value" id="mttSpike">--</span></div>
      <div class="tooltip-stat-item"><span class="ts-label">Source</span><span class="ts-value" id="mttSource">--</span></div>
    </div>
  `;
  mapContainer.appendChild(tooltip);

  const getGeoJSON = () => ({
    type: 'FeatureCollection',
    features: zones.map((z, i) => ({
      type: 'Feature',
      id: i,
      properties: { ...z },
      geometry: { type: 'Point', coordinates: [z.lng, z.lat] }
    }))
  });

  map.on('load', () => {
    map.addSource('aqi-source', { type: 'geojson', data: getGeoJSON() });

    // 1. Heatmap Layer
    map.addLayer({
      id: 'aqi-heat',
      type: 'heatmap',
      source: 'aqi-source',
      maxzoom: 15,
      layout: { 'visibility': 'visible' },
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0, 400, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0, 255, 156, 0)',
          0.2, 'rgba(34, 197, 94, 0.45)',
          0.4, 'rgba(255, 181, 71, 0.55)',
          0.6, 'rgba(255, 140, 66, 0.65)',
          0.8, 'rgba(255, 77, 77, 0.75)',
          1, 'rgba(192, 38, 211, 0.85)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 30, 15, 80],
        'heatmap-opacity': 0.7
      }
    });

    // 2. AQI Nodes
    map.addLayer({
      id: 'aqi-nodes',
      type: 'circle',
      source: 'aqi-source',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 14],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'aqi'],
          50, '#22C55E', 100, '#FFB547', 150, '#FF8C42', 200, '#FF4D4D', 300, '#C026D3'
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0B0F0E',
        'circle-opacity': 0.95
      }
    });

    // 3. Labels
    map.addLayer({
      id: 'aqi-labels',
      type: 'symbol',
      source: 'aqi-source',
      layout: {
        'text-field': ['get', 'aqi'],
        'text-font': ['Open Sans Semibold'],
        'text-size': 11,
        'text-offset': [0, 0],
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2,
        'text-halo-blur': 1
      }
    });

    // Interaction Handlers
    map.on('mousemove', 'aqi-nodes', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features[0].properties;
      tooltip.classList.add('active');
      document.getElementById('mttName').textContent = f.name;
      document.getElementById('mttAQI').textContent = f.aqi;
      document.getElementById('mttStress').textContent = f.stress + '%';
      document.getElementById('mttSpike').textContent = calcSpikeScore(f) + '%';
      document.getElementById('mttSource').textContent = f.source;

      tooltip.style.left = `${e.point.x}px`;
      tooltip.style.top = `${e.point.y}px`;
    });

    map.on('mouseleave', 'aqi-nodes', () => {
      map.getCanvas().style.cursor = '';
      tooltip.classList.remove('active');
    });

    map.on('click', 'aqi-nodes', (e) => {
      const coords = e.features[0].geometry.coordinates;
      map.flyTo({
        center: coords,
        zoom: 12.8,
        speed: 0.8,
        curve: 1.2,
        pitch: 55
      });

      const zoneData = e.features[0].properties;

      // Update current forecast zone directly for duration analysis
      if (typeof window.currentForecastZone !== 'undefined') {
        window.currentForecastZone = zoneData;
      }

      if (window.updateASIComponents) {
        window.updateASIComponents(zoneData);
      }
    });
  });

  // Controls
  const updateMapLayer = (metric) => {
    document.querySelectorAll('.map-layer-controls .layer-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`layerBtn${metric.charAt(0).toUpperCase() + metric.slice(1)}`)?.classList.add('active');

    // Turn off heat unless explicitly selected
    map.setLayoutProperty('aqi-heat', 'visibility', metric === 'stress' ? 'visible' : 'none');

    // Make nodes visible
    map.setLayoutProperty('aqi-nodes', 'visibility', 'visible');
    map.setLayoutProperty('aqi-labels', 'visibility', 'visible');
    map.setLayoutProperty('aqi-labels', 'text-size', 11); // reset default

    if (metric === 'aqi') {
      map.setPaintProperty('aqi-nodes', 'circle-color', [
        'interpolate', ['linear'], ['get', 'aqi'],
        50, '#22C55E', 100, '#FFB547', 150, '#FF8C42', 200, '#FF4D4D', 300, '#C026D3'
      ]);
      map.setPaintProperty('aqi-nodes', 'circle-radius', ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 14]);
      map.setLayoutProperty('aqi-labels', 'text-field', ['get', 'aqi']);

    } else if (metric === 'stress') {
      map.setPaintProperty('aqi-nodes', 'circle-color', [
        'interpolate', ['linear'], ['get', 'stress'],
        20, '#22C55E', 50, '#FFB547', 70, '#FF8C42', 85, '#FF4D4D', 100, '#C026D3'
      ]);
      map.setPaintProperty('aqi-nodes', 'circle-radius', ['interpolate', ['linear'], ['zoom'], 10, 7, 15, 16]);
      map.setLayoutProperty('aqi-labels', 'text-field', ['concat', ['to-string', ['get', 'stress']], '%']);

    } else if (metric === 'vuln') {
      map.setPaintProperty('aqi-nodes', 'circle-color', [
        'interpolate', ['linear'], ['get', 'vuln'],
        20, '#22C55E', 50, '#FFB547', 70, '#FF8C42', 85, '#FF4D4D', 100, '#C026D3'
      ]);
      map.setPaintProperty('aqi-nodes', 'circle-radius', ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 14]);
      map.setLayoutProperty('aqi-labels', 'text-field', ['get', 'vuln']);

    } else if (metric === 'source') {
      map.setPaintProperty('aqi-nodes', 'circle-color', [
        'match', ['get', 'source'],
        'Traffic', '#C026D3',
        'Industry', '#FF4D4D',
        'Construction', '#FFB547',
        'External', '#22C55E',
        '#888' // default
      ]);
      map.setPaintProperty('aqi-nodes', 'circle-radius', ['interpolate', ['linear'], ['zoom'], 10, 8, 15, 18]);
      map.setLayoutProperty('aqi-labels', 'text-field', ['get', 'source']);
      map.setLayoutProperty('aqi-labels', 'text-size', 10);
    }
  };

  document.getElementById('layerBtnAQI')?.addEventListener('click', () => updateMapLayer('aqi'));
  document.getElementById('layerBtnStress')?.addEventListener('click', () => updateMapLayer('stress'));
  document.getElementById('layerBtnVuln')?.addEventListener('click', () => updateMapLayer('vuln'));
  document.getElementById('layerBtnSource')?.addEventListener('click', () => updateMapLayer('source'));

  // ── AQI Fog: drives atmospheric haze color/density off live AQI ──────────
  function applyAQIFog(aqi) {
    if (!map.isStyleLoaded()) return;
    // Higher AQI → denser, more amber/red fog
    let fogColor, fogRange;
    if (aqi > 300) { fogColor = 'rgba(80, 20, 20, 0.55)'; fogRange = [0.4, 12]; }
    else if (aqi > 200) { fogColor = 'rgba(100, 50, 10, 0.45)'; fogRange = [0.6, 16]; }
    else if (aqi > 100) { fogColor = 'rgba(80, 60, 10, 0.35)'; fogRange = [0.8, 20]; }
    else { fogColor = 'rgba(5, 20, 12, 0.2)'; fogRange = [1.2, 24]; }

    map.setFog({
      color: fogColor,
      'high-color': 'rgba(5, 20, 12, 0.15)',
      'horizon-blend': 0.08,
      'space-color': 'rgba(0, 0, 0, 0.9)',
      'star-intensity': 0.0,
      range: fogRange
    });
  }

  let is3D = false;

  map.on('load', () => {

    // ── Sky layer for atmospheric depth ──────────────────────────────────
    if (map.getLayer) {
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 10,
          'sky-atmosphere-color': 'rgba(5, 20, 12, 1)',
          'sky-horizon-blend': 0.05,
          'sky-atmosphere-halo-color': 'rgba(0, 255, 156, 0.1)'
        }
      });
    }

    // ── Real 3D Buildings from CARTO vector tiles ─────────────────────────
    // CARTO dark-matter tiles expose a 'building' source-layer with height data
    map.addLayer(
      {
        id: 'real-3d-buildings',
        type: 'fill-extrusion',
        source: 'carto',
        'source-layer': 'building',
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': '#141E2E',
          // ×8 multiplier so even 3-storey buildings are clearly visible at zoom 12-13
          'fill-extrusion-height': [
            '*', 8,
            ['coalesce', ['get', 'render_height'], ['get', 'height'], 12]
          ],
          'fill-extrusion-base': [
            '*', 8,
            ['coalesce', ['get', 'render_min_height'], 0]
          ],
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-vertical-gradient': true
        }
      },
      'aqi-nodes'
    );
  });

  // ── 3D Toggle Button Logic ────────────────────────────────────────────
  const toggle3DBtn = document.getElementById('toggle3DBtn');

  // Navigation hint overlay (shown once when 3D activates)
  const navHint = document.createElement('div');
  navHint.style.cssText = `
    position:absolute; bottom:48px; left:50%; transform:translateX(-50%);
    background:rgba(7,26,18,0.88); border:1px solid rgba(0,255,156,0.25);
    color:#8BA89A; font-size:0.72rem; padding:7px 14px; border-radius:20px;
    pointer-events:none; white-space:nowrap; z-index:200;
    transition:opacity 0.4s ease; opacity:0; backdrop-filter:blur(8px);
    font-family:'Inter',sans-serif; letter-spacing:0.03em;
  `;
  navHint.textContent = '🖱 Right-drag or Ctrl+drag to orbit · Scroll to zoom';
  mapContainer.style.position = 'relative';
  mapContainer.appendChild(navHint);

  if (toggle3DBtn) {
    toggle3DBtn.addEventListener('click', () => {
      is3D = !is3D;
      toggle3DBtn.classList.toggle('active', is3D);
      toggle3DBtn.textContent = is3D ? '2D' : '3D';

      const apply = () => {
        if (is3D) {
          // Show real 3D buildings
          map.setLayoutProperty('real-3d-buildings', 'visibility', 'visible');

          // Reduce heatmap opacity so buildings are legible underneath
          map.setPaintProperty('aqi-heat', 'heatmap-opacity', 0.35);

          // Apply AQI pollution fog
          const avgAQI = zones.length
            ? Math.round(zones.reduce((s, z) => s + z.aqi, 0) / zones.length)
            : 150;
          applyAQIFog(avgAQI);

          // Tilt camera deep for the 3D perspective feel — zoom to 14 so buildings are immediately tall
          map.easeTo({ pitch: 58, bearing: -20, zoom: 14, center: [77.209, 28.613], duration: 1200 });

          // Briefly show navigation hint
          navHint.style.opacity = '1';
          setTimeout(() => { navHint.style.opacity = '0'; }, 4000);

        } else {
          // Restore 2D flat view
          map.setLayoutProperty('real-3d-buildings', 'visibility', 'none');
          map.setPaintProperty('aqi-heat', 'heatmap-opacity', 0.7);

          // Remove fog
          map.setFog(null);

          map.easeTo({ pitch: 45, bearing: -15, zoom: 10.3, center: [77.16, 28.62], duration: 800 });
        }
      };

      if (map.isStyleLoaded()) apply();
      else map.once('idle', apply);
    });
  }

  // Refresh fog whenever live AQI data arrives
  window._refreshMapFog = () => {
    if (!is3D) return;
    const avgAQI = zones.length
      ? Math.round(zones.reduce((s, z) => s + z.aqi, 0) / zones.length)
      : 150;
    applyAQIFog(avgAQI);
  };

  window._airnetMap = map;
})();

// ── Helpers ──────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── ASI Gauge ────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('asiGauge');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let current = 0;
  let target = 0;
  let animationId = null;

  function draw() {
    canvas.width = 200; canvas.height = 120;
    const cx = 100, cy = 108, r = 88;
    ctx.clearRect(0, 0, 200, 120);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Fill gradient: Index scale (0-100)
    const frac = current / 100;
    const grad = ctx.createLinearGradient(0, 0, 200, 0);
    grad.addColorStop(0, '#22C55E');   // Good
    grad.addColorStop(0.2, '#FFB547'); // Moderate
    grad.addColorStop(0.4, '#FF8C42'); // Poor
    grad.addColorStop(0.6, '#FF4D4D'); // Very Poor
    grad.addColorStop(1, '#C026D3');   // High

    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.min(frac, 1) * Math.PI, false);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Ticks
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
      ctx.lineTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
      ctx.strokeStyle = 'rgba(0,255,156,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const asiEl = document.getElementById('asiValue');
    if (asiEl) asiEl.textContent = Math.round(current);

    if (Math.abs(target - current) > 0.5) {
      current += (target - current) * 0.1; // Smooth easing
      animationId = requestAnimationFrame(draw);
    } else {
      current = target;
      if (asiEl) asiEl.textContent = Math.round(current);
    }
  }

  // Exposed function to update both the gauge and the mini-bars
  window.updateASIComponents = function (zone) {
    if (!zone) return;

    // 1. AI Composite Score (ASI 0-100) — uses AIRNET_CONFIG weights
    const nAQI = Math.min(100, (zone.aqi / AIRNET_CONFIG.aqi.ceiling) * 100);
    target = Math.round(
      (nAQI * AIRNET_CONFIG.asi.aqiWeight) +
      (zone.stress * AIRNET_CONFIG.asi.stressWeight) +
      (calcSpikeScore(zone) * AIRNET_CONFIG.asi.spikeWeight) +
      (zone.vuln * AIRNET_CONFIG.asi.vulnWeight)
    );

    const asiEl = document.getElementById('asiValue');
    if (asiEl) {
      if (target > 70) asiEl.classList.add('pulse-glow');
      else asiEl.classList.remove('pulse-glow');
    }

    const nEl = document.getElementById('asiZoneName');
    if (nEl) nEl.textContent = zone.name || 'NCR Average';

    // 2. Trigger gauge animation
    if (animationId) cancelAnimationFrame(animationId);
    draw();

    // 3. Update detail bars with DERIVED dynamic calculations
    try {
      // ── Current AQI (raw, normalized to 0-100 for bar width) ──────────────
      // Formula: AQI / 500 * 100  (500 = Indian AQI ceiling)
      const aqiPct = Math.min(100, Math.round((zone.aqi / 500) * 100));
      const aqiFill = document.getElementById('asiAqiFill');
      const aqiVal = document.getElementById('asiAqiVal');
      if (aqiFill) aqiFill.style.width = aqiPct + '%';
      if (aqiVal) aqiVal.textContent = zone.aqi || 0;
      if (aqiFill) aqiFill.style.background = aqiPct > 70 ? '#FF4D4D' : aqiPct > 50 ? '#FF8C42' : '#FFB547';

      // ── Duration Score (0-100): how long this zone has been under stress ──
      // Formula: blends zone stress + cascade risk + whether AQI is above 200.
      //   base  = zone.stress (already 0-100, proportional to historical stress hours)
      //   boost = +10 if the zone is marked as a cascade zone (persistent multi-day exposure)
      //   drop  = -5 if current AQI is below 100 (zone is recovering)
      const durBoost = zone.cascade ? 10 : 0;
      const durRecovery = zone.aqi < 100 ? -5 : 0;
      const durScore = Math.min(100, Math.max(0, Math.round((zone.stress || 0) + durBoost + durRecovery)));
      const durFill = document.getElementById('asiDurFill');
      const durVal = document.getElementById('asiDurVal');
      if (durFill) durFill.style.width = durScore + '%';
      if (durFill) durFill.style.background = durScore > 70 ? '#FF8C42' : '#FFB547';
      if (durVal) durVal.textContent = durScore;

      // ── Spike Probability (0-100): likelihood of a sudden AQI spike ───────
      // Formula: multi-factor Bayesian proxy:
      //   base         = zone.spike (initial WAQI/AI-derived probability)
      //   wind factor  = higher wind speed lowers spike prob (disperses pollutants)
      //   cascade flag = +8 if zone links to adjacent high-AQI zones
      //   hour factor  = rush hours (7-10, 17-21 IST) add +6 to prob
      // Use the shared helper (keeps ASI gauge in sync with Tab 1 metric + Tab 2 engine)
      const spikeScore = calcSpikeScore(zone);
      const spikeFill = document.getElementById('asiSpikeFill');
      const spikeVal = document.getElementById('asiSpikeVal');
      if (spikeFill) spikeFill.style.width = spikeScore + '%';
      if (spikeFill) spikeFill.style.background = spikeScore > 70 ? '#FFB547' : '#00C472';
      if (spikeVal) spikeVal.textContent = spikeScore;

      // ── Vulnerability Index (0-100): severity of impact on the population ─
      // Formula: composite of socio-environmental exposure:
      //   base     = zone.vuln (infra + demographic sensitivity from WAQI model)
      //   aqiMult  = zones with AQI >300 are magnified (+8), recovery zones discounted (-5)
      //   cascade  = cascade zones amplify vulnerability as pollution lingers (+5)
      const aqiVulnBoost = zone.aqi > 300 ? 8 : zone.aqi < 100 ? -5 : 0;
      const cascadeVuln = zone.cascade ? 5 : 0;
      const vulnScore = Math.min(100, Math.max(0, Math.round((zone.vuln || 0) + aqiVulnBoost + cascadeVuln)));
      const vulnFill = document.getElementById('asiVulnFill');
      const vulnVal = document.getElementById('asiVulnVal');
      if (vulnFill) vulnFill.style.width = vulnScore + '%';
      if (vulnFill) vulnFill.style.background = vulnScore > 70 ? '#FF4D4D' : vulnScore > 50 ? '#FF8C42' : '#00FF9C';
      if (vulnVal) vulnVal.textContent = vulnScore;

      // 4. Final Debug Log
      const windSpeed = (window.__LIVE_WIND__ && window.__LIVE_WIND__.speed) ? window.__LIVE_WIND__.speed : 5;
      const windSuppression = Math.min(AIRNET_CONFIG.spike.windCap, Math.round(windSpeed * AIRNET_CONFIG.spike.windFactor));
      const rushBoost = (new Date().getHours() >= AIRNET_CONFIG.rushHours.morningStart && new Date().getHours() <= AIRNET_CONFIG.rushHours.morningEnd) || (new Date().getHours() >= AIRNET_CONFIG.rushHours.eveningStart && new Date().getHours() <= AIRNET_CONFIG.rushHours.eveningEnd) ? AIRNET_CONFIG.spike.rushBoost : 0;
      const cascadeBoost = zone.cascade ? AIRNET_CONFIG.spike.cascadeBoost : 0;

      console.log(`[ASI] Zone: ${zone.name} | AQI%: ${aqiPct} | Duration: ${durScore} (stress ${zone.stress} + cascade ${durBoost}) | Spike: ${spikeScore} (base ${zone.spike} - wind ${windSuppression} + cascade ${cascadeBoost} + rush ${rushBoost}) | Vuln: ${vulnScore} (base ${zone.vuln} + aqiBoost ${aqiVulnBoost} + cascade ${cascadeVuln})`);
    } catch (err) {
      console.error("DOM Error rendering ASI Bars:", err);
    }

    // 4. Update Risk Countdown
    if (typeof startRiskCountdown === 'function') {
      try { startRiskCountdown(zone); } catch (err) { }
    }

    // 5. Safely pass zone to System 2 Forecast Lab
    try {
      if (typeof currentForecastZone !== 'undefined') {
        currentForecastZone = zone;
        const activeBtn = document.querySelector('#system2 .panel-controls .ctrl-btn.active') || document.querySelector('.ctrl-btn.active');
        const period = activeBtn ? parseInt(activeBtn.id.replace('fc', '').replace('h', '')) || 6 : 6;

        if (typeof forecastChart !== 'undefined' && forecastChart) {
          forecastChart.data = typeof buildForecastData === 'function' ? buildForecastData(period) : forecastChart.data;
          forecastChart.update('active');
        }

        const sel = document.getElementById('forecastZoneSelector');
        if (sel && Array.from(sel.options).some(opt => opt.value === zone.name)) {
          sel.value = zone.name;
        }

        // Update auxiliary Forecast Lab metrics regardless of chart status
        if (typeof window.renderExposureRing === 'function') window.renderExposureRing();
        if (typeof window.runConsequenceSim === 'function') window.runConsequenceSim();
      }
    } catch (err) {
      console.error("Error syncing System 2 models:", err);
    }
  };

  // Initial render
  setTimeout(() => {
    if (zones && zones.length > 0) {
      const mostStressedZone = zones.reduce((prev, current) => (prev.aqi > current.aqi) ? prev : current);
      window.updateASIComponents(mostStressedZone);
    }
  }, 1000);
})();

// ── Risk Countdown ───────────────────────────────────────
let cdTotal = 0;
let riskIntervalId = null;

/**
 * Returns a dynamic countdown base (in seconds) that scales with AQI severity.
 * AQI < 100 → 24h, 100-200 → 18h, 200-300 → 12h, > 300 → 8h
 */
function getDynamicCountdownBase(aqi) {
  const h = AIRNET_CONFIG.countdownHours;
  if (aqi < 100) return h.low * 3600;
  if (aqi < 200) return h.moderate * 3600;
  if (aqi < 300) return h.poor * 3600;
  return h.veryPoor * 3600;
}

function startRiskCountdown(zone) {
  if (riskIntervalId) clearInterval(riskIntervalId);

  // Dynamic base: high-AQI zones start with less runway
  const cdStart = getDynamicCountdownBase(zone.aqi || 200);

  // Proxy calculation: Higher AQI, stress & spike probability = less time until critical threshold
  const aqiDeduction = Math.min((zone.aqi / 500) * (cdStart * 0.75), cdStart * 0.85);
  const stressDeduction = (zone.stress / 100) * (cdStart * 0.15);
  const spikeDeduction = (calcSpikeScore(zone) / 100) * (cdStart * 0.1);

  cdTotal = Math.max(0, Math.round(cdStart - aqiDeduction - stressDeduction - spikeDeduction));
  const newStart = cdTotal; // Track the new ceiling for the progress bar

  riskIntervalId = setInterval(() => {
    if (cdTotal <= 0) {
      clearInterval(riskIntervalId);
      return;
    }
    cdTotal--;
    const h = Math.floor(cdTotal / 3600);
    const m = Math.floor((cdTotal % 3600) / 60);
    const s = cdTotal % 60;

    const hEl = document.getElementById('cdHours');
    const mEl = document.getElementById('cdMins');
    const sEl = document.getElementById('cdSecs');

    if (hEl) hEl.textContent = String(h).padStart(2, '0');
    if (mEl) mEl.textContent = String(m).padStart(2, '0');
    if (sEl) sEl.textContent = String(s).padStart(2, '0');

    const pct = (1 - (cdTotal / (cdStart || 1))) * 100;
    const fill = document.getElementById('riskFill');
    if (fill) fill.style.width = Math.min(100, (40 + pct * 0.6)) + '%';
  }, 1000);
}
// Automatically hooked into updateASIComponents below

// ── Wind/Pollution Flow Canvas ───────────────────────────
(function () {
  const canvas = document.getElementById('windFlow');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const particles = Array.from({ length: 50 }, () => ({
    x: Math.random() * 300,
    y: Math.random() * 130,
    vx: 1.0 + Math.random() * 1.6,
    vy: (Math.random() - 0.5) * 0.5,
    life: Math.random(),
    opacity: Math.random() * 0.6 + 0.2,
    size: 1 + Math.random() * 1.5,
  }));

  function drawFlow() {
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = 130;
    ctx.fillStyle = 'rgba(7,26,18,0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.life += 0.012;
      if (p.x > canvas.width + 10 || p.life > 1) {
        p.x = -5; p.y = Math.random() * canvas.height; p.life = 0;
      }
      const alpha = Math.sin(p.life * Math.PI) * p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,156,${alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(drawFlow);
  }
  drawFlow();
})();

// ══════════════════════════════════════════════════════════
// SYSTEM 2 — FORECAST & EXPOSURE LAB
// ══════════════════════════════════════════════════════════

let currentForecastZone = null;

function getDynamicForecast(hours) {
  // Use the focused zone's private forecast, fallback to global NCR forecast, or generate a flat line
  let baseArray;
  if (currentForecastZone && currentForecastZone.forecast24h && currentForecastZone.forecast24h.length > 0) {
    baseArray = currentForecastZone.forecast24h;
  } else {
    // If the data is empty, default to a flat line of the anchor AQI
    const anchor = (currentForecastZone ? currentForecastZone.aqi : (window.__LIVE_AQI_BASE__ || 200));
    baseArray = window.__LIVE_FORECAST__ && window.__LIVE_FORECAST__.length > 0
      ? window.__LIVE_FORECAST__
      : Array.from({ length: 24 }, () => anchor);
  }

  // Define time steps based on requested period (6h=1h steps, 12h=2h steps, 24h=4h steps)
  const step = hours === 6 ? 1 : hours === 12 ? 2 : 4;
  const labels = ['Now'];

  // Anchor to the specific zone AQI or the global average
  const anchorAQI = currentForecastZone ? currentForecastZone.aqi : (window.__LIVE_AQI_BASE__ || 200);

  // Force the 0h "Now" point to exactly equal the live map reading
  const main = [anchorAQI];

  const upper = [anchorAQI + 5]; // Tight CI at 0h
  const lower = [Math.max(0, anchorAQI - 5)];

  // Get inaction modifiers based on zone vulnerability
  const spike = currentForecastZone ? calcSpikeScore(currentForecastZone) : 30;

  // Calculate variance percentage (volatility) based on the zone's spike probability
  const variancePct = 0.05 + ((spike / 100) * 0.15); // 5% to 20% variance

  for (let i = 1; i <= 6; i++) {
    const hrIndex = Math.min(23, i * step);
    labels.push(`+${hrIndex}h`);

    // The core forecast comes directly from the backend data analytics array
    const rawVal = baseArray[hrIndex] || main[i - 1];

    // Smooth the transition from the real-time exact reading 'anchor' to the forecast curve
    const interpolationFactor = Math.min(1, hrIndex / 6);
    const val = Math.round(anchorAQI * (1 - interpolationFactor) + rawVal * interpolationFactor);

    // Calculate confidence interval boundaries scaling with time + volatility
    const varianceMagnitude = val * variancePct * (hrIndex / 24); // expands over 24h

    main.push(val);
    upper.push(Math.round(val + 10 + varianceMagnitude)); // Cone of uncertainty expands over time
    lower.push(Math.max(0, Math.round(val - 10 - varianceMagnitude)));
  }

  return { labels, main, upper, lower };
}

const forecastCtx = document.getElementById('forecastChart');
let forecastChart = null;
if (forecastCtx) {
  forecastChart = new Chart(forecastCtx.getContext('2d'), {
    type: 'line',
    data: buildForecastData('6h'),
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: C.tooltip,
          titleColor: '#fff',
          bodyColor: 'rgba(200,240,220,0.7)',
          borderColor: 'rgba(0,255,156,0.15)',
          borderWidth: 1,
        }
      },
      scales: {
        x: {
          grid: { color: C.grid },
          ticks: { color: 'rgba(150,200,170,0.5)', font: { size: 11 } },
          title: {
            display: true,
            text: 'Time (Forecast Horizon)',
            color: 'rgba(150,200,170,0.45)',
            font: { size: 11, family: 'Inter, sans-serif' },
            padding: { top: 6 }
          }
        },
        y: {
          grid: { color: C.grid },
          ticks: { color: 'rgba(150,200,170,0.5)', font: { size: 11 } },
          min: 0,
          max: 500,
          title: {
            display: true,
            text: 'AQI Level',
            color: 'rgba(150,200,170,0.45)',
            font: { size: 11, family: 'Inter, sans-serif' },
            padding: { bottom: 6 }
          }
        }
      }
    }
  });
}

function buildForecastData(hours) {
  const d = getDynamicForecast(hours);
  return {
    labels: d.labels,
    datasets: [
      {
        label: 'Projected AQI (No Action)',
        data: d.main,
        borderColor: C.accent,
        backgroundColor: 'rgba(0,255,156,0.07)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: C.accent,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Upper CI',
        data: d.upper,
        borderColor: 'rgba(0,255,156,0.18)',
        borderDash: [4, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Lower CI',
        data: d.lower,
        borderColor: 'rgba(0,255,156,0.18)',
        borderDash: [4, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(0,255,156,0.03)',
        tension: 0.4,
      }
    ]
  };
}

// Forecast toggles
['fc6h', 'fc12h', 'fc24h'].forEach(id => {
  const el = document.getElementById(id);
  if (!el || !forecastChart) return;
  el.addEventListener('click', () => {
    const hours = parseInt(id.replace('fc', '').replace('h', ''));
    forecastChart.data = buildForecastData(hours);
    forecastChart.update('active');
  });
});

function populateForecastZoneSelector() {
  const sel = document.getElementById('forecastZoneSelector');
  if (!sel) return;
  sel.innerHTML = '<option value="">NCR Average (Global)</option>';
  zones.forEach(z => {
    sel.innerHTML += `<option value="${z.name}">${z.name}</option>`;
  });
}

// Initialize selector events and options
setTimeout(() => {
  populateForecastZoneSelector();
  const sel = document.getElementById('forecastZoneSelector');
  if (sel) {
    sel.addEventListener('change', (e) => {
      const selectedName = e.target.value;
      if (!selectedName) {
        currentForecastZone = null;
      } else {
        currentForecastZone = zones.find(z => z.name === selectedName);
      }

      const activeBtn = document.querySelector('#system2 .panel-controls .ctrl-btn.active');
      const period = activeBtn ? parseInt(activeBtn.id.replace('fc', '').replace('h', '')) || 6 : 6;
      if (typeof forecastChart !== 'undefined' && forecastChart) {
        forecastChart.data = typeof buildForecastData === 'function' ? buildForecastData(period) : forecastChart.data;
        forecastChart.update('active');
      }

      // Update auxiliary Forecast Lab metrics
      if (typeof window.runConsequenceSim === 'function') window.runConsequenceSim();
    });
  }
}, 1000);

// Spike zones
function renderSpikeZones() {
  const szWrap = document.getElementById('spikeZones');
  if (!szWrap) return;
  szWrap.innerHTML = '';
  // Sort by spike percentage and show all zones
  // Sort by derived spike score (synced with Tab 1 ASI gauge formula)
  const topSpikes = [...zones].sort((a, b) => calcSpikeScore(b) - calcSpikeScore(a));
  topSpikes.forEach(z => {
    const score = calcSpikeScore(z);
    const color = score > 80 ? '#C026D3' : score > 65 ? '#FF4D4D' : score > 45 ? '#FFB547' : '#22C55E';
    szWrap.innerHTML += `
      <div class="spike-zone-row">
        <span class="spike-zone-name">${z.name}</span>
        <div class="spike-zone-bar"><div class="spike-zone-fill" style="width:${score}%;background:${color}"></div></div>
        <span class="spike-zone-pct" style="color:${color}">${score}%</span>
      </div>`;
  });
}
window.renderSpikeZones = renderSpikeZones;
renderSpikeZones();

// Exposure ring (animated)
window.renderExposureRing = function () {
  const canvas = document.getElementById('exposureRing');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Clear previous frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  canvas.width = 160; canvas.height = 160;
  const cx = 80, cy = 80, r = 58;

  // Mathematical Exposure Budget (Proxy)
  const sourceAQI = currentForecastZone ? currentForecastZone.aqi : (window.__LIVE_AQI_BASE__ || 100);

  // Hours into the day based on local time, with a 6 AM reset (24-hour interval)
  const now = new Date();
  const currentHourRaw = now.getHours() + (now.getMinutes() / 60);
  let hoursElapsed = currentHourRaw >= 6 ? (currentHourRaw - 6) : (18 + currentHourRaw);

  // WHO Daily Safe Window relative to AQI. Baseline: 24h at AQI=50
  // Note: This limit changes dynamically when the real-time sourceAQI fluctuates.
  const safeWindowHrs = Math.min(24, 24 * (50 / Math.max(1, sourceAQI)));

  let usedHrs = hoursElapsed; // Assume exposed at this average AQI all day
  let usedFrac = usedHrs / safeWindowHrs;
  usedFrac = Math.min(1.0, Math.max(0.05, usedFrac)); // Clamp 5% to 100%
  const safeFrac = 1 - usedFrac;
  const remainingHrs = Math.max(0, safeWindowHrs - usedHrs);

  // Helpers
  const formatTime = (totalHours) => {
    const h = Math.floor(Math.max(0, totalHours));
    const m = Math.floor(Math.max(0, (totalHours - h) * 60));
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 2 * 1.5, false);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Safe portion
  const grad = ctx.createLinearGradient(0, 0, 160, 160);

  // Color the ring based on how much is left
  if (usedFrac > 0.8) {
    grad.addColorStop(0, '#FF4D4D');
    grad.addColorStop(1, '#FFB547');
  } else if (usedFrac > 0.5) {
    grad.addColorStop(0, '#FFB547');
    grad.addColorStop(1, '#FF8C42');
  } else {
    grad.addColorStop(0, '#00FF9C');
    grad.addColorStop(1, '#22C55E');
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + safeFrac * Math.PI * 2, false);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Update the text in the DOM
  const expTimeEl = document.getElementById('expTime');
  if (expTimeEl) expTimeEl.textContent = formatTime(remainingHrs);

  const safeWinEl = document.getElementById('expSafeWindow');
  if (safeWinEl) safeWinEl.textContent = formatTime(safeWindowHrs);

  const usedTodayEl = document.getElementById('expUsedToday');
  if (usedTodayEl) usedTodayEl.textContent = formatTime(Math.min(usedHrs, safeWindowHrs));

  let riskGroups = "Unusually Sensitive People";
  let riskColor = "var(--aqi-good)";
  if (sourceAQI > 200) { riskGroups = "All Populations"; riskColor = "var(--severe)"; }
  else if (sourceAQI > 200) { riskGroups = "Everyone, Respiratory Issues"; riskColor = "var(--vp)"; }
  else if (sourceAQI > 100) { riskGroups = "Elderly, Children, Asthmatics"; riskColor = "var(--poor)"; }
  else if (sourceAQI > 50) { riskColor = "var(--aqi-moderate)"; }

  const rgEl = document.getElementById('expRiskGroups');
  if (rgEl) {
    rgEl.textContent = riskGroups;
    rgEl.style.color = riskColor;
  }
};
window.renderExposureRing();

// Consequence sim
window.runConsequenceSim = function () {

  // Auto-run mathematics based on current zone
  const sourceAQI = currentForecastZone ? currentForecastZone.aqi : (window.__LIVE_AQI_BASE__ || 200);
  const fArray = (currentForecastZone && currentForecastZone.forecast24h) ? currentForecastZone.forecast24h : (window.__LIVE_FORECAST__ || []);

  // Look 12 hours into the future using the exact graph calculation
  let projected12h = sourceAQI;
  if (fArray && fArray.length > 0) {
    // Generate the exact forecast curve matching the graph
    const chartData = getDynamicForecast(12);
    // The +12h point is the last element in the 12h forecast array (index 6)
    projected12h = chartData.main[6] || sourceAQI;
  }

  // Determine risk category of the projected future
  let futureRisk = "High";
  let futureColor = "#C026D3";
  let simAction = "Lockdown / Grade IV";

  if (projected12h < 100) { futureRisk = "Satisfactory"; futureColor = "#92CF5C"; simAction = "Monitor"; }
  else if (projected12h < 200) { futureRisk = "Moderate"; futureColor = "#FFB547"; simAction = "Advisory"; }
  else if (projected12h < 300) { futureRisk = "Poor"; futureColor = "#FF8C42"; simAction = "Grade II GRAP"; }

  const elAQI = document.getElementById('simProjAQI');
  if (elAQI) {
    elAQI.textContent = projected12h;
    elAQI.style.color = futureColor;
  }

  const elRisk = document.getElementById('simProjRisk');
  if (elRisk) {
    elRisk.textContent = futureRisk;
    elRisk.style.color = futureColor;
  }

  // Calculate specific population and stress for the zone
  // Lookup real zone population from table; fallback to Delhi total if zone unknown
  const popBase = currentForecastZone
    ? (ZONE_POPULATION_M[currentForecastZone.name] ?? currentForecastZone.pop ?? 0.40)
    : 32.1; // total NCR population (millions)
  const stressRaw = currentForecastZone ? currentForecastZone.stress : 65;
  const futureStress = Math.min(100, Math.round(stressRaw + ((projected12h - sourceAQI) * 0.15)));

  const elStress = document.getElementById('simProjStress');
  if (elStress) {
    elStress.textContent = `${futureStress} / 100`;
    elStress.style.color = futureStress > 80 ? '#C026D3' : futureStress > 60 ? '#FF4D4D' : '#FFB547';
  }

  const elPop = document.getElementById('simProjPop');
  if (elPop) {
    // If AQI increases significantly, impacted pop goes up mildly based on spread
    const exposedPct = Math.min(1.0, (projected12h / 500) + 0.2);
    const finalPop = (popBase * exposedPct).toFixed(1);
    elPop.textContent = `${finalPop}M`;
  }

  const elAction = document.getElementById('simProjAction');
  if (elAction) {
    elAction.textContent = "Req: " + simAction;
  }

  document.querySelectorAll('#inactionResults .inaction-val').forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'fadeIn 0.5s ease';
  });
};



// ══════════════════════════════════════════════════════════
// SYSTEM 3 — SOURCE & VULNERABILITY INTELLIGENCE
// ══════════════════════════════════════════════════════════

const srcColors = [C.accent, C.moderate, C.vp, '#00D4A0'];
const srcLabels = ['Traffic', 'Industry', 'Construction', 'External'];

let activeZone = zones[0]?.name || 'Anand Vihar';
let sourceDonutChart = null;

const sdCtx = document.getElementById('sourceDonut');
if (sdCtx) {
  sourceDonutChart = new Chart(sdCtx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: srcLabels,
      datasets: [{
        data: [40, 30, 20, 10], // initial fallback
        backgroundColor: srcColors,
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: C.tooltip, titleColor: '#fff', bodyColor: 'rgba(200,240,220,0.7)' }
      }
    }
  });
}

// ── Source attribution: time-of-day weighted, multi-factor mix ────────────────
function computeSourceMix(zone) {
  const hour = new Date().getHours();
  const isRush = (hour >= AIRNET_CONFIG.rushHours.morningStart && hour <= AIRNET_CONFIG.rushHours.morningEnd)
    || (hour >= AIRNET_CONFIG.rushHours.eveningStart && hour <= AIRNET_CONFIG.rushHours.eveningEnd);
  const isNight = hour < 6 || hour > 22;

  // Base shares: primary source dominates, others share the remainder
  const trafficBase = zone.source === 'Traffic' ? 42 : 10;
  const industryBase = zone.source === 'Industry' ? 42 : 10;
  const constBase = zone.source === 'Construction' ? 42 : 10;
  const extBase = zone.source === 'External' ? 42 : 10;

  // Time-of-day modifiers: rush hours boost traffic, night boosts industry
  const trafficBoost = isRush ? 14 : 0;
  const industryBoost = isNight ? 12 : 0;

  // AQI severity boost for dominant source (higher AQI = source contributes more)
  const aqiBoost = Math.min(10, Math.round((zone.aqi / AIRNET_CONFIG.aqi.ceiling) * 10));

  const raw = [
    trafficBase + trafficBoost + (zone.source === 'Traffic' ? aqiBoost : 0) + Math.random() * 6,
    industryBase + industryBoost + (zone.source === 'Industry' ? aqiBoost : 0) + Math.random() * 6,
    constBase + (zone.source === 'Construction' ? aqiBoost : 0) + Math.random() * 6,
    extBase + (zone.source === 'External' ? aqiBoost : 0) + Math.random() * 6,
  ];
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map(v => Math.round((v / total) * 100));
}

function updateSourceChart(zoneName) {
  const dataZone = zones.find(z => z.name === zoneName) || zones[0];
  const normalized = computeSourceMix(dataZone);

  if (sourceDonutChart) {
    sourceDonutChart.data.datasets[0].data = normalized;
    sourceDonutChart.update();
  }

  const legend = document.getElementById('sourceLegend');
  const bars = document.getElementById('sourceBars');
  if (!legend || !bars) return;
  legend.innerHTML = '';
  bars.innerHTML = '';
  normalized.forEach((v, i) => {
    const label = srcLabels[i], color = srcColors[i];
    legend.innerHTML += `<div class="src-legend-item"><span class="src-dot" style="background:${color}"></span>${label}: ${v}%</div>`;
    bars.innerHTML += `<div class="src-bar-row">
      <span class="src-bar-name">${label}</span>
      <div class="src-bar-track"><div class="src-bar-fill" style="width:${v}%;background:${color}"></div></div>
      <span class="src-bar-pct" style="color:${color}">${v}%</span>
    </div>`;
  });
}

window.initSystem3GlobalSelector = function () {
  const gSelector = document.getElementById('sys3GlobalZoneSelector');
  if (!gSelector) return;

  const sortedZones = [...zones].sort((a, b) => b.aqi - a.aqi);
  if (!activeZone || !zones.some(z => z.name === activeZone)) {
    activeZone = sortedZones.length > 0 ? sortedZones[0].name : "NCR Average";
  }

  gSelector.innerHTML = '';

  sortedZones.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z.name;
    opt.textContent = `${z.name} (AQI: ${z.aqi})`;
    gSelector.appendChild(opt);
  });

  gSelector.value = activeZone;

  const newSelector = gSelector.cloneNode(true);
  gSelector.parentNode.replaceChild(newSelector, gSelector);

  newSelector.addEventListener('change', (e) => {
    activeZone = e.target.value;

    // 1. Source Attribution Logic
    updateSourceChart(activeZone);

    // 2. Trajectory Map Logic
    if (window.updateTrajectoryMap) {
      window.updateTrajectoryMap(activeZone);
      if (window.renderTrajectoryData) window.renderTrajectoryData(activeZone);
    }

    // 3. Vulnerability Logic
    if (window.renderVulnZones) {
      window.renderVulnZones(activeZone);
    }

    // 4. Affected Infrastructure Logic
    if (window.renderAffectedInfrastructure) {
      window.renderAffectedInfrastructure(activeZone);
    }
  });

  updateSourceChart(activeZone);

  // Initial load
  if (window.renderAffectedInfrastructure) {
    window.renderAffectedInfrastructure(activeZone);
  }
};


// ── Wind Trajectory Map (MapLibre) ─────────────────────────
let trajMapInstance = null;
let trajAnimFrame = null;
let trajTime = 0;
let trajHoverPopup = null;

// Add custom popup styling for the premium tooltip
const tooltipStyle = document.createElement('style');
tooltipStyle.textContent = `
  .premium-traj-popup .maplibregl-popup-content {
    background: transparent !important;
    padding: 0 !important;
    box-shadow: none !important;
  }
  .premium-traj-popup .maplibregl-popup-tip {
    display: none !important;
  }
`;
document.head.appendChild(tooltipStyle);

window.updateTrajectoryMap = function (zoneName) {
  const container = document.getElementById('trajectoryMap');
  if (!container) return;

  // Initialize map only once
  if (!trajMapInstance) {
    trajMapInstance = new maplibregl.Map({
      container: 'trajectoryMap',
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [77.2090, 28.6139],
      zoom: 9,
      attributionControl: false
      // Map is fully interactive by default (drag, pinch, scroll zoom)
    });

    trajHoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'premium-traj-popup',
      offset: 10
    });

    trajMapInstance.on('load', () => {
      // Add zones source
      trajMapInstance.addSource('traj-zones-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Add wind paths source
      trajMapInstance.addSource('traj-paths-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Add wind particles source
      trajMapInstance.addSource('traj-particles-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Add glow layer below paths
      trajMapInstance.addLayer({
        id: 'traj-paths-glow',
        type: 'line',
        source: 'traj-paths-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 8,
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.4,
            0
          ],
          'line-blur': 4
        }
      });

      // Add actual paths layer
      trajMapInstance.addLayer({
        id: 'traj-paths',
        type: 'line',
        source: 'traj-paths-source',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            3,
            2
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.9,
            0.4
          ],
          'line-dasharray': [4, 4]
        }
      });

      // Add direction arrows along paths matching the color
      trajMapInstance.addLayer({
        id: 'traj-paths-arrows',
        type: 'symbol',
        source: 'traj-paths-source',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 50,
          'text-field': '▶',
          'text-size': 12,
          'text-keep-upright': false,
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1.0,
            0.6
          ]
        }
      });

      trajMapInstance.addLayer({
        id: 'traj-particles',
        type: 'circle',
        source: 'traj-particles-source',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 4,
          'circle-opacity': 0.9,
          'circle-blur': 0.3
        }
      });

      trajMapInstance.addLayer({
        id: 'traj-zones',
        type: 'circle',
        source: 'traj-zones-source',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['get', 'radius'],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#000'
        }
      });

      // Labels
      trajMapInstance.addLayer({
        id: 'traj-labels',
        type: 'symbol',
        source: 'traj-zones-source',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': '#000',
          'text-halo-width': 1
        }
      });

      let hoveredLineId = null;

      // Cursor changes and popups
      trajMapInstance.on('mousemove', 'traj-paths', (e) => {
        trajMapInstance.getCanvas().style.cursor = 'pointer';

        if (e.features.length > 0) {
          if (hoveredLineId !== null) {
            trajMapInstance.setFeatureState(
              { source: 'traj-paths-source', id: hoveredLineId },
              { hover: false }
            );
          }
          hoveredLineId = e.features[0].id;
          trajMapInstance.setFeatureState(
            { source: 'traj-paths-source', id: hoveredLineId },
            { hover: true }
          );

          const props = e.features[0].properties;
          const html = [
            '<div style="background: rgba(7, 26, 18, 0.95); border: 1px solid #00FF9C; padding: 12px; border-radius: 8px; font-family: Inter, sans-serif; color: #fff; min-width: 170px; box-shadow: 0 4px 16px rgba(0,255,156,0.2); backdrop-filter: blur(8px);">',
            '<div style="font-size: 10px; color: #00FF9C; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 700; display: flex; align-items: center; gap: 6px;">',
            '<span style="display:inline-block; width:6px; height:6px; background:#00FF9C; border-radius:50%;"></span>',
            'Active trajectory',
            '</div>',
            '<div style="font-size: 12px; margin-bottom: 5px; display: flex; justify-content: space-between;">',
            '<span style="opacity: 0.7;">Origin:</span> <strong>' + props.sourceName + '</strong>',
            '</div>',
            '<div style="font-size: 12px; margin-bottom: 5px; display: flex; justify-content: space-between;">',
            '<span style="opacity: 0.7;">Dest:</span> <strong>' + props.targetName + '</strong>',
            '</div>',
            '<div style="font-size: 12px; margin-bottom: 5px; display: flex; justify-content: space-between;">',
            '<span style="opacity: 0.7;">Speed:</span> <strong style="color: #FFB547;">' + props.windSpeed.toFixed(1) + ' km/h</strong>',
            '</div>',
            '<div style="font-size: 11px; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(0,255,156,0.2); opacity: 0.8; text-align: right;">',
            'Live Feed',
            '</div>',
            '</div>'
          ].join(''); trajHoverPopup.setLngLat(e.lngLat).setHTML(html).addTo(trajMapInstance);
        }
      });

      trajMapInstance.on('mouseleave', 'traj-paths', () => {
        trajMapInstance.getCanvas().style.cursor = '';
        if (hoveredLineId !== null) {
          trajMapInstance.setFeatureState(
            { source: 'traj-paths-source', id: hoveredLineId },
            { hover: false }
          );
        }
        hoveredLineId = null;
        trajHoverPopup.remove();
      });

      // Drag cursor states
      trajMapInstance.on('mousedown', () => {
        trajMapInstance.getCanvas().style.cursor = 'grabbing';
      });
      trajMapInstance.on('mouseup', () => {
        trajMapInstance.getCanvas().style.cursor = '';
      });

      renderTrajData(zoneName);
    });
  } else if (trajMapInstance.isStyleLoaded()) {
    renderTrajData(zoneName);
  } else {
    trajMapInstance.once('load', () => renderTrajData(zoneName));
  }
};


// ── Per-zone wind data cache (keyed by zone name) ────────────────────────
// Fetched once per session from Open-Meteo using each zone's lat/lng.
const _zoneWindCache = {};

/**
 * Fetch real wind speed + direction for every zone from Open-Meteo.
 * Uses the free current-weather endpoint (no API key required).
 * Results are stored in _zoneWindCache[zoneName] = { speed, direction }.
 * Falls back to window.__LIVE_WIND__ or defaults if the fetch fails.
 */
async function fetchZoneWindData() {
  const pending = zones.filter(z => !_zoneWindCache[z.name] && z.lat && z.lng);
  if (!pending.length) return;

  // Open-Meteo supports multiple lat/lng pairs in one call
  // but the free tier URL only accepts a single location. We batch
  // up to 5 at a time using Promise.allSettled to avoid rate limits.
  const BATCH = 5;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(async z => {
      try {
        const url = `${AIRNET_APIS.meteoWx.base}?latitude=${z.lat}&longitude=${z.lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&forecast_days=1`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        const cur = data?.current;
        if (cur) {
          _zoneWindCache[z.name] = {
            speed: cur.wind_speed_10m ?? 5,
            direction: cur.wind_direction_10m ?? 270
          };
          console.log(`[Wind] ${z.name}: ${_zoneWindCache[z.name].speed} km/h @ ${_zoneWindCache[z.name].direction}°`);
        }
      } catch (err) {
        console.warn(`[Wind] ${z.name} fetch failed:`, err.message);
      }
    }));
  }

  // After fetching, re-render the trajectory map with updated wind data
  if (trajMapInstance && window.__activeZone3) {
    if (typeof renderTrajData === 'function') renderTrajData(window.__activeZone3);
  }
}

// Kick off wind fetch on load and refresh every 10 minutes
fetchZoneWindData();
setInterval(fetchZoneWindData, 10 * 60 * 1000);

function renderTrajData(targetZoneName) {
  if (trajAnimFrame) cancelAnimationFrame(trajAnimFrame);

  // Global fallback wind (single NCR-wide reading from DB or hardcoded default)
  const globalWind = window.__LIVE_WIND__ || { speed: 5, direction: 270 };

  // Helper: get wind for a specific zone, fall back to global
  function getZoneWind(zoneName) {
    const w = _zoneWindCache[zoneName] || globalWind;
    return {
      speed: w.speed,
      angleRad: (w.direction % 360) * (Math.PI / 180)
    };
  }


  // Find target zone
  let targetZone = zones.find(z => z.name === targetZoneName);
  if (!targetZone && zones.length > 0) targetZone = zones[0];
  if (!targetZone) return;

  // Track active zone so fetchZoneWindData can trigger a re-render
  window.__activeZone3 = targetZoneName;

  // ── Build trajectory paths using per-zone wind vectors ──────────────────
  const allPaths = [];
  const renderedNodes = [];

  zones.forEach(src => {
    renderedNodes.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [src.lng, src.lat] },
      properties: {
        name: src.name,
        color: src.aqi > 300 ? C.vp : src.aqi > 200 ? C.poor : src.aqi > 100 ? C.moderate : C.good,
        radius: src.name === targetZoneName ? 8 : 4
      }
    });

    // Look up this source zone's own wind vector
    const srcWind = getZoneWind(src.name);

    // Find all zones that this source 'blows into' based on its local wind vector
    zones.forEach(target => {
      if (src.name !== target.name) {
        const dx = target.lng - src.lng;
        const dy = target.lat - src.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Only connect reasonably close areas (within approx 15-20km, ~0.15 deg)
        if (dist > 0.02 && dist < 0.15) {
          const angleToTarget = Math.atan2(dy, dx);

          let diff = Math.abs(angleToTarget - srcWind.angleRad);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;

          // Connect if target is strictly downwind (within 35 degree cone)
          if (diff < (Math.PI / 5)) {
            const lineColor = src.aqi > 200 ? C.vp : src.aqi > 100 ? C.poor : C.bg;
            allPaths.push({
              sourceCoords: [src.lng, src.lat],
              targetCoords: [target.lng, target.lat],
              color: lineColor,
              dist: dist,
              sourceName: src.name,
              targetName: target.name,
              windSpeed: srcWind.speed  // per-zone real speed
            });
          }
        }
      }
    });
  });

  // Filter to the most relevant lines to prevent overwhelming the map
  const topPaths = allPaths.sort((a, b) => a.dist - b.dist).slice(0, 40);

  const linesGeoJSON = {
    type: 'FeatureCollection',
    features: topPaths.map((p, i) => ({
      type: 'Feature',
      id: i,
      geometry: { type: 'LineString', coordinates: [p.sourceCoords, p.targetCoords] },
      properties: {
        color: p.color,
        sourceName: p.sourceName,
        targetName: p.targetName,
        windSpeed: p.windSpeed
      }
    }))
  };

  trajMapInstance.getSource('traj-zones-source').setData({ type: 'FeatureCollection', features: renderedNodes });
  trajMapInstance.getSource('traj-paths-source').setData(linesGeoJSON);

  // Pan to the selected zone
  trajMapInstance.flyTo({ center: [targetZone.lng, targetZone.lat], zoom: 9.5, speed: 0.5 });

  // Update label
  const trajLbl = document.getElementById('trajOriginZones');
  if (trajLbl) trajLbl.textContent = targetZoneName + " Matrix";

  // Animate particles — each path uses its own wind speed
  trajTime = 0;
  function animateParticles() {
    trajTime += 0.003; // base tick; individual paths scale by wind speed
    const particleFeatures = topPaths.map((p, i) => {
      const speed = p.windSpeed || 5;
      const progress = ((trajTime * speed * 0.04) + i * 0.17) % 1;
      const x = p.sourceCoords[0] + (p.targetCoords[0] - p.sourceCoords[0]) * progress;
      const y = p.sourceCoords[1] + (p.targetCoords[1] - p.sourceCoords[1]) * progress;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [x, y] },
        properties: { color: p.color }
      };
    });

    if (trajMapInstance && trajMapInstance.getSource('traj-particles-source')) {
      trajMapInstance.getSource('traj-particles-source').setData({
        type: 'FeatureCollection',
        features: particleFeatures
      });
    }

    trajAnimFrame = requestAnimationFrame(animateParticles);
  }

  animateParticles();

  if (window.renderTrajectoryData) {
    window.renderTrajectoryData(targetZoneName, topPaths);
  }
}

// Initialize the trajectory map AND the source zones on first load
initSystem3GlobalSelector();
if (zones.length > 0) {
  window.updateTrajectoryMap(zones[0].name);
}

// ----------------------------------------------------
// Trajectory Intelligence Overview Data
// ----------------------------------------------------
window.renderTrajectoryData = function (zoneName, topPaths = []) {
  // Function logic removed since the "Trajectory Live Data" card was removed from the UI.
};

// Vulnerability zones (Pollutant Grid)
let activeVulnZone = null;

function renderVulnZones(zoneName = null) {
  const vulnGrid = document.getElementById('vulnGrid');
  if (!vulnGrid) return;

  // We are now controlled specifically by the sys3GlobalZoneSelector
  const targetZoneName = zoneName || activeVulnZone || (zones.length > 0 ? zones[0].name : null);
  if (!targetZoneName) return;
  activeVulnZone = targetZoneName;

  const dataZone = zones.find(z => z.name === targetZoneName) || zones[0];
  const baseAqi = dataZone.aqi;

  // Synthesize baseline pollutant levels:
  // Priority 1 — real WAQI iaqi readings stored in zone.pollutants
  // Priority 2 — ratio derivation from AQI (fallback)
  const p = dataZone.pollutants || {};
  const pData = [
    { name: 'PM2.5', value: p.pm25 != null ? p.pm25 : Math.round(baseAqi * 0.65), unit: 'μg/m³', limit: 60, scale: 0.8 },
    { name: 'PM10', value: p.pm10 != null ? p.pm10 : Math.round(baseAqi * 1.15), unit: 'μg/m³', limit: 100, scale: 1.2 },
    { name: 'NO2', value: p.no2 != null ? p.no2 : Math.round(baseAqi * 0.18), unit: 'μg/m³', limit: 80, scale: 0.2 },
    { name: 'SO2', value: p.so2 != null ? p.so2 : Math.round(baseAqi * 0.08), unit: 'μg/m³', limit: 80, scale: 0.1 },
    { name: 'CO', value: p.co != null ? p.co : (baseAqi * 0.005).toFixed(1), unit: 'mg/m³', limit: 4, scale: 0.01 },
    { name: 'Ozone', value: p.ozone != null ? p.ozone : Math.round(baseAqi * 0.12), unit: 'μg/m³', limit: 100, scale: 0.15 },
  ];
  // Tag where the value came from so we know if it's real or derived
  const hasRealData = p.pm25 != null;

  vulnGrid.innerHTML = '';

  pData.forEach(p => {
    // Real data: no noise injection; derived data: add slight live-feel noise
    let displayVal;
    if (hasRealData && (p.name === 'PM2.5' || p.name === 'PM10' || p.name === 'NO2' || p.name === 'SO2')) {
      displayVal = p.value; // raw from WAQI — already an integer
    } else {
      const noise = (Math.sin(Date.now() / 1000 + targetZoneName.length) * 5 * p.scale);
      displayVal = p.name === 'CO'
        ? (parseFloat(p.value) + noise * 0.1).toFixed(1)
        : Math.max(0, Math.round(p.value + noise));
    }

    // Determine severity color based on proportion to WHO/NAAQS limits
    let severityRatio = p.name === 'CO' ? displayVal / p.limit : displayVal / p.limit;
    let color = C.good;
    if (severityRatio > 2.5) color = C.vp;
    else if (severityRatio > 1.5) color = '#FF4D4D'; // Poor
    else if (severityRatio > 0.8) color = C.moderate;

    vulnGrid.innerHTML += `
      <div style="background: rgba(7, 26, 18, 0.6); border: 1px solid rgba(0,255,156,0.1); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 0.7rem; color: #8BA89A; letter-spacing: 0.4px;">${p.name}</div>
        <div style="font-size: 1.15rem; font-weight: bold; color: ${color}; margin: 2px 0;">${displayVal} <span style="font-size: 0.6rem; color: #8BA89A; font-weight: normal;">${p.unit}</span></div>
        <div style="font-size: 0.62rem; color: #8BA89A; display: flex; align-items: center; gap: 4px;">
           <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${color}"></span>
           Limit: ${p.limit}
        </div>
      </div>
    `;
  });
}
window.renderVulnZones = renderVulnZones;
renderVulnZones();

// ── Zone-specific population lookup (millions) ────────────────────────────
const ZONE_POPULATION_M = {
  'Central Delhi': 0.58, 'North Delhi': 0.89, 'South Delhi': 2.73,
  'East Delhi': 1.71, 'West Delhi': 2.54, 'Gurugram': 1.50,
  'Noida': 0.64, 'Faridabad': 1.80, 'Ghaziabad': 2.36,
  'Greater Noida': 0.68, 'Dwarka': 0.65, 'Rohini': 0.90,
  'Bahadurgarh': 0.22, 'Punjabi Bagh': 0.38, 'RK Puram': 0.30,
  'Anand Vihar': 0.32, 'Okhla': 0.45, 'Najafgarh': 0.18,
  'Bawana': 0.22, 'Sonipat': 0.35,
  // Legacy fallback zone names
  'Jahangirpuri': 0.28, 'Mundka': 0.24, 'Mandir Marg': 0.20,
  'Shahdara': 0.56, 'North Campus': 0.18, 'Vasundhara': 0.40,
  'Saket': 0.28, 'Pitampura': 0.34, 'East Delhi Hub': 0.45,
  'Mayur Vihar': 0.38, 'Kalkaji': 0.31, 'Paschim Vihar': 0.36,
  'Timarpur': 0.18, 'Lodhi Road': 0.12, 'Noida Bdr': 0.22,
  'Faridabad Bdr': 0.32, 'North Campus': 0.18,
};
// Population density (people/km²) — used in simulation payload
const ZONE_DENSITY_K = {
  'Central Delhi': 29000, 'North Delhi': 12000, 'South Delhi': 11000,
  'East Delhi': 22000, 'West Delhi': 15000, 'Gurugram': 3700,
  'Noida': 2500, 'Faridabad': 5000, 'Ghaziabad': 6300,
  'Rohini': 14000, 'Dwarka': 8500, 'Anand Vihar': 18000,
  'Okhla': 13000, 'Punjabi Bagh': 16000, 'Bawana': 3200,
};

// ── Zone bounding boxes (south, west, north, east) ────────────────────────
// Covers the actual geographic extent of each monitoring zone.
// Format: [S, W, N, E] in decimal degrees.
const ZONE_BBOX = {
  'Central Delhi': [28.600, 77.185, 28.675, 77.265],
  'North Delhi': [28.680, 77.095, 28.760, 77.230],
  'South Delhi': [28.475, 77.145, 28.620, 77.295],
  'East Delhi': [28.615, 77.260, 28.710, 77.370],
  'West Delhi': [28.600, 77.040, 28.710, 77.195],
  'Gurugram': [28.375, 76.975, 28.540, 77.135],
  'Noida': [28.515, 77.305, 28.655, 77.480],
  'Faridabad': [28.355, 77.270, 28.480, 77.415],
  'Ghaziabad': [28.615, 77.375, 28.740, 77.555],
  'Greater Noida': [28.435, 77.475, 28.560, 77.650],
  'Dwarka': [28.525, 76.960, 28.605, 77.090],
  'Rohini': [28.705, 77.060, 28.790, 77.185],
  'Bahadurgarh': [28.660, 76.870, 28.730, 76.985],
  'Punjabi Bagh': [28.655, 77.110, 28.710, 77.190],
  'RK Puram': [28.545, 77.155, 28.605, 77.225],
  'Anand Vihar': [28.628, 77.295, 28.670, 77.340],
  'Okhla': [28.530, 77.260, 28.585, 77.325],
  'Najafgarh': [28.585, 76.945, 28.660, 77.070],
  'Bawana': [28.760, 77.015, 28.840, 77.110],
  'Sonipat': [28.945, 76.990, 29.055, 77.110],
};

// ── Overpass API infrastructure fetcher ─────────────────────────────────
// In-memory cache for the current session
const _infraCache = {};
// localStorage TTL: 72 hours — infrastructure doesn't change day-to-day
const INFRA_CACHE_TTL_MS = 72 * 60 * 60 * 1000;

function _infraLocalKey(zoneName) { return `airnet_infra_v2_${zoneName}`; }

function _infraFromStorage(zoneName) {
  try {
    const raw = localStorage.getItem(_infraLocalKey(zoneName));
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > INFRA_CACHE_TTL_MS) {
      localStorage.removeItem(_infraLocalKey(zoneName));
      return null;
    }
    console.log(`[Overpass] ${zoneName}: served from localStorage cache`);
    return data;
  } catch { return null; }
}

function _infraToStorage(zoneName, data) {
  try {
    localStorage.setItem(_infraLocalKey(zoneName), JSON.stringify({ data, cachedAt: Date.now() }));
  } catch { /* storage full — ignore */ }
}

async function fetchInfrastructureCounts(zone) {
  // 1. In-memory hit (same browser session)
  if (_infraCache[zone.name]) return _infraCache[zone.name];

  // 2. localStorage hit (up to 72 h — infra doesn't change daily)
  const stored = _infraFromStorage(zone.name);
  if (stored) { _infraCache[zone.name] = stored; return stored; }

  if (!zone.lat || !zone.lng) return null;

  // 3. Build exact zone bbox from lookup table — whole zone, not a fixed circle
  const bboxArr = ZONE_BBOX[zone.name];
  // Overpass bbox order: (S,W,N,E)
  const bb = bboxArr
    ? `${bboxArr[0]},${bboxArr[1]},${bboxArr[2]},${bboxArr[3]}`
    : `${zone.lat - 0.05},${zone.lng - 0.05},${zone.lat + 0.05},${zone.lng + 0.05}`;
  const bboxNote = bboxArr
    ? `${((bboxArr[2] - bboxArr[0]) * 111).toFixed(1)}km × ${((bboxArr[3] - bboxArr[1]) * 111 * Math.cos(zone.lat * Math.PI / 180)).toFixed(1)}km`
    : 'fallback ±5km';

  // ── STRATEGY 1+2: Multi-tag + Hindi/English name regex ──────────────────
  const OAH_NAME = 'vridha ashram|vriddha|vriddhashram|old age home|old age|aged home|senior citizen home|senior home|nursing home|geriatric|shanti niwas|\u0936\u093e\u0902\u0924\u093f \u0928\u093f\u0935\u093e\u0938|\u0935\u0943\u0926\u094d\u0927\u093e\u0936\u094d\u0930\u092e|\u0935\u0943\u0926\u094d\u0927|\u092c\u0943\u0926\u094d\u0927|\u0935\u0930\u093f\u0937\u094d\u0920';
  const q = `[out:json][timeout:30];
(
  node["amenity"="school"](${bb});
  way["amenity"="school"](${bb});
  node["amenity"="hospital"](${bb});
  way["amenity"="hospital"](${bb});
  node["amenity"="clinic"](${bb});
  way["amenity"="clinic"](${bb});
  node["healthcare"="clinic"](${bb});
  way["healthcare"="clinic"](${bb});
  node["amenity"="nursing_home"](${bb});
  way["amenity"="nursing_home"](${bb});
  node["amenity"="old_peoples_home"](${bb});
  way["amenity"="old_peoples_home"](${bb});
  node["amenity"="social_facility"]["social_facility"="nursing_home"](${bb});
  way["amenity"="social_facility"]["social_facility"="nursing_home"](${bb});
  node["amenity"="social_facility"]["social_facility"="assisted_living"](${bb});
  way["amenity"="social_facility"]["social_facility"="assisted_living"](${bb});
  node["amenity"="social_facility"]["social_facility"="hospice"](${bb});
  way["amenity"="social_facility"]["social_facility"="hospice"](${bb});
  node["name"~"${OAH_NAME}",i](${bb});
  way["name"~"${OAH_NAME}",i](${bb});
);
out tags;`;

  try {
    const res = await fetch(AIRNET_APIS.overpass.base, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(q),
      signal: AbortSignal.timeout(30000)
    });
    const data = await res.json();
    const elements = data.elements || [];

    // ── STRATEGY 3: Deduplicate by OSM element id before counting ──────────
    const seen = new Set();
    const deduped = elements.filter(e => {
      const key = `${e.type}-${e.id}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });

    const schools = deduped.filter(e => e.tags?.amenity === 'school').length;
    const hospitals = deduped.filter(e => e.tags?.amenity === 'hospital').length;
    const clinics = deduped.filter(e =>
      e.tags?.amenity === 'clinic' || e.tags?.healthcare === 'clinic').length;

    // Old age: match ALL tag variants + any name-regex hits
    const OLD_AGE_TAGS = new Set(['nursing_home', 'old_peoples_home']);
    const OLD_AGE_SF = new Set(['nursing_home', 'assisted_living', 'hospice']);
    const OLD_AGE_NAME_RE = /vridha ashram|vriddha|vriddhashram|old age home|old age|aged home|senior citizen home|senior home|nursing home|geriatric|shanti niwas|\u0936\u093e\u0902\u0924\u093f|\u0935\u0943\u0926\u094d\u0927|\u092c\u0943\u0926\u094d\u0927|\u0935\u0930\u093f\u0937\u094d\u0920/i;

    const oldAgeRaw = deduped.filter(e => {
      const tags = e.tags || {};
      if (OLD_AGE_TAGS.has(tags.amenity)) return true;
      if (tags.amenity === 'social_facility' && OLD_AGE_SF.has(tags.social_facility)) return true;
      if (tags.name && OLD_AGE_NAME_RE.test(tags.name)) return true;
      return false;
    }).length;

    // ── STRATEGY 4: Data quality flag ─────────────────────────────────────
    const zonePop = (ZONE_POPULATION_M[zone.name] || 0.3) * 1e6;
    const dataQuality = (oldAgeRaw === 0 && zonePop > 500000) ? 'likely incomplete' : 'complete';

    // ── STRATEGY 5: Never display 0 for old age homes in India ────────────
    const oldAge = oldAgeRaw > 0 ? oldAgeRaw : null; // null = trigger fallback label

    const result = { schools, hospitals, oldAge, clinics, dataQuality, bboxNote, live: true };
    _infraCache[zone.name] = result;
    _infraToStorage(zone.name, result);
    console.log(`[Overpass] ${zone.name} (${bboxNote}): schools=${schools} hospitals=${hospitals} clinics=${clinics} oldAge=${oldAgeRaw} quality=${dataQuality}`);
    return result;
  } catch (err) {
    console.warn(`[Overpass] ${zone.name} fetch failed:`, err.message);
    return null;
  }
}

// Affected Infrastructure (Dynamic — Overpass API + deterministic seed fallback)
window.renderAffectedInfrastructure = async function (zoneName) {
  const infraList = document.getElementById('infraList');
  const badge = document.getElementById('infraZoneBadge');
  if (!infraList) return;

  const zone = zones.find(z => z.name === zoneName);
  if (!zone) {
    infraList.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">Select a specific zone on the map to view infrastructure</div>`;
    if (badge) badge.textContent = "No Zone";
    return;
  }
  if (badge) badge.textContent = zone.name;

  // Show a loading pulse while Overpass is queried
  infraList.innerHTML = `<div style="text-align:center;padding:18px;color:var(--text-muted);font-size:0.82rem;animation:pulse 1.5s infinite;">Fetching live infrastructure data…</div>`;

  // Try Overpass first, fall through to seeded seed if unavailable
  let live = await fetchInfrastructureCounts(zone);

  let schoolsCount, hospitalCount, oldAgeCount, clinicsCount;
  if (live) {
    // Overpass returned real counts
    schoolsCount = live.schools || 0;
    hospitalCount = live.hospitals || 0;
    oldAgeCount = live.oldAge || 0;
    clinicsCount = live.clinics || 0;
  } else {
    // Deterministic seed fallback (original logic)
    let seed = 0;
    if (zone.lat && zone.lng) {
      seed = (zone.lat + zone.lng) * 10000;
    } else {
      for (let i = 0; i < zone.name.length; i++) seed += zone.name.charCodeAt(i) * (i + 1);
    }
    const rand = (offset) => { let x = Math.sin(seed + offset) * 10000; return x - Math.floor(x); };
    schoolsCount = Math.floor(rand(1) * 8) + 1;
    hospitalCount = Math.floor(rand(2) * 4) + 1;
    oldAgeCount = Math.floor(rand(3) * 3);
    clinicsCount = Math.floor(rand(4) * 6) + 2;
  }

  const riskLevel = zone.aqi > 250 ? 'high' : zone.aqi > 150 ? 'medium' : 'low';
  const srcLabel = live ? '' : ' (est.)';

  const infraItems = [
    {
      icon: '🏫', type: 'school', name: `${zone.name} Schools`,
      count: `${schoolsCount}${srcLabel} nearby`, risk: riskLevel
    },
    {
      icon: '🏥', type: 'hospital', name: `Major Hospitals`,
      count: `${hospitalCount}${srcLabel} nearby`, risk: riskLevel
    },
    {
      icon: '👵', type: 'resident', name: 'Old Age / Nursing Homes',
      count: (() => {
        if (!live) return oldAgeCount > 0 ? `${oldAgeCount} (est.) nearby` : '< 5 (est.)';
        if (live.oldAge === null) {
          // Strategy 5: never show 0 for Indian zones
          const qualNote = live.dataQuality === 'likely incomplete' ? '· OSM data sparse' : '';
          return `< 5 (OSM limited) ${qualNote}`;
        }
        return `${live.oldAge} nearby`;
      })(),
      risk: riskLevel
    },
    {
      icon: '🏨', type: 'clinic', name: 'Clinics / Dispensaries',
      count: `${clinicsCount}${srcLabel} nearby`, risk: riskLevel
    },
  ];

  infraList.innerHTML = '';
  infraItems.forEach((it, i) => {
    infraList.innerHTML += `<div class="infra-item" style="animation-delay: ${i * 0.05}s">
      <div class="infra-icon ${it.type}">${it.icon}</div>
      <span class="infra-name">${it.name}</span>
      <span style="font-size:0.66rem;color:var(--text-muted);flex-shrink:0;">${it.count}</span>
      <span class="infra-risk ${it.risk}" style="flex-shrink:0;">${it.risk.toUpperCase()}</span>
    </div>`;
  });
};

// Master dynamic hook
window.updateDynamicSubsystems = function () {
  if (typeof renderSpikeZones === 'function') renderSpikeZones();
  if (typeof updateDurationChart === 'function') updateDurationChart();
  if (typeof renderExposureRing === 'function') renderExposureRing();
  if (typeof runConsequenceSim === 'function') runConsequenceSim();
  if (window.renderVulnZones) window.renderVulnZones();
  if (window.renderSourceZones) window.renderSourceZones();
  if (window.renderPriorityZones) window.renderPriorityZones();
  if (window.updateDurationChart) window.updateDurationChart();

  const mostStressedZone = zones.reduce((prev, current) => (prev.aqi > current.aqi) ? prev : current);
  if (window.updateASIComponents) window.updateASIComponents(mostStressedZone);

  // Get active system 3 zone to map infrastructure
  const sys3Select = document.getElementById('sys3GlobalZoneSelector');
  if (sys3Select && sys3Select.value) {
    if (window.renderAffectedInfrastructure) window.renderAffectedInfrastructure(sys3Select.value);
  } else if (zones && zones.length > 0) {
    if (window.renderAffectedInfrastructure) window.renderAffectedInfrastructure(zones[0].name);
  }
};

// (Legacy System 4 code removed)

// ══════════════════════════════════════════════════════════
// SYSTEM 5 — POLICY RECOMMENDATION
// ══════════════════════════════════════════════════════════

let sys5ScatterChart = null;

function initSystem5() {
  const zSelect = document.getElementById('sys5GlobalZoneSelector');
  const aiBody = document.getElementById('aiActionBody');
  const rl = document.getElementById('rankedList');
  const scEl = document.getElementById('scatterPlot');

  // Populate Dropdown
  window.populateSys5Dropdown = () => {
    if (zSelect) {
      const sortedZones = [...zones].sort((a, b) => b.aqi - a.aqi);
      console.log("[System 5] Populating dropdown with", sortedZones.length, "zones.");
      zSelect.innerHTML = sortedZones.map(z => `<option value="${z.name}">${z.name} (AQI: ${z.aqi})</option>`).join('');
    }
  };
  window.populateSys5Dropdown();

  // Listen for zone changes natively on this dropdown
  if (zSelect) {
    zSelect.addEventListener('change', (e) => {
      const selectedName = e.target.value;
      console.log("[System 5] Selected Zone changed to:", selectedName);
      generateAIRecommendations(selectedName);
    });
  }

  // Also listen for global changes from other tabs to sync up
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'sys4GlobalZoneSelector' || e.target.id === 'sys3GlobalZoneSelector') {
      const selectedName = e.target.value;
      if (zSelect && Array.from(zSelect.options).some(opt => opt.value === selectedName)) {
        zSelect.value = selectedName;
        generateAIRecommendations(selectedName);
      }
    }
  });

  // Base Interventions Library
  const interventions = [
    { id: 'full_stack', name: 'Heavy Vehicle Restriction + Industrial Cap', type: 'hybrid', baseImpact: 0.25, baseDisrupt: 45 },
    { id: 'traffic_heavy', name: 'Full Traffic Flow Reduction (50%)', type: 'traffic', baseImpact: 0.18, baseDisrupt: 30 },
    { id: 'dust_const', name: 'Dust Mitigation + Construction Halt', type: 'construction', baseImpact: 0.12, baseDisrupt: 15 },
    { id: 'industry_cap', name: 'Industrial Emission Cap (80%)', type: 'industry', baseImpact: 0.20, baseDisrupt: 50 },
    { id: 'traffic_light', name: 'Off-Peak Traffic Routing', type: 'traffic', baseImpact: 0.08, baseDisrupt: 10 },
    { id: 'dust_light', name: 'Targeted Dust Sweeping', type: 'dust', baseImpact: 0.05, baseDisrupt: 5 }
  ];

  // Helper to render results (from either AI or local fallback) onto the DOM
  function renderRecommendations(zone, data, usedFallback) {
    const { topStrategy, rankedInterventions, scatterPoints } = data;

    // 1. Render Top Strategy
    if (aiBody) {
      const modelLabel = usedFallback
        ? `<span style="font-size:0.65rem;color:var(--aqi-moderate);margin-left:8px;">📊 Local Model</span>`
        : `<span style="font-size:0.65rem;color:var(--accent);margin-left:8px;">✨ Predictive Model</span>`;

      aiBody.innerHTML = `
        <div class="ai-top-strat">
          <div class="ai-strat-label">Top Recommended Strategy for ${zone.name} ${modelLabel}</div>
          <div class="ai-strat-name">${topStrategy.name}</div>
          <div class="ai-strat-desc" style="font-size:0.82rem;color:var(--text-muted);margin-top:6px;line-height:1.5;">${topStrategy.description}</div>
          <div class="ai-metrics-row">
            <div class="ai-metric-cell"><span class="val" style="color:var(--aqi-good)">−${topStrategy.expectedAqiDrop} AQI</span><span class="lbl">Expected Drop</span></div>
            <div class="ai-metric-cell"><span class="val" style="color:var(--accent)">${topStrategy.healthBenefit}</span><span class="lbl">Health Benefit</span></div>
            <div class="ai-metric-cell"><span class="val" style="color:var(--aqi-moderate)">${topStrategy.confidence}%</span><span class="lbl">Confidence</span></div>
            <div class="ai-metric-cell"><span class="val" style="color:#00D4A0">${topStrategy.riskMitigation}/100</span><span class="lbl">Risk Mitigation</span></div>
          </div>
        </div>
        <div class="ai-confidence-bar-wrap">
          <div class="ai-conf-row"><span class="ai-conf-label">${topStrategy.sourceAlignment || 'Source Alignment Match (' + zone.source + ')'}</span><span class="ai-conf-val">94%</span></div>
          <div class="ai-conf-bar"><div class="ai-conf-fill" style="width:${topStrategy.confidence}%"></div></div>
        </div>`;
    }

    // 2. Render Ranked List
    if (rl) {
      rl.innerHTML = '';
      rankedInterventions.forEach(r => {
        rl.innerHTML += `<div class="ranked-item">
          <span class="ranked-rank">#${r.rank}</span>
          <div class="ranked-content">
            <div class="ranked-name">${r.name}</div>
            <div class="ranked-desc">${r.description}</div>
          </div>
          <div class="ranked-score">
            <span class="ranked-aqi-drop">−${r.expectedAqiDrop} AQI</span>
            <span class="ranked-disrupt">${r.disruptionScore} disruption</span>
          </div>
        </div>`;
      });
    }

    // 3. Update Scatter Chart
    if (scEl) {
      if (!sys5ScatterChart) {
        sys5ScatterChart = new Chart(scEl.getContext('2d'), {
          type: 'scatter',
          data: { datasets: [] },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: C.tooltip, titleColor: '#fff',
                bodyColor: 'rgba(200,240,220,0.7)',
                borderColor: 'rgba(0,255,156,0.15)', borderWidth: 1,
                callbacks: { label: ctx => [`Impact: −${ctx.raw.y} AQI`, `Disruption: ${ctx.raw.x}`, ctx.raw.label] }
              }
            },
            scales: {
              x: { grid: { color: C.grid }, ticks: { color: 'rgba(150,200,170,0.5)' }, title: { display: true, text: 'Economic Disruption Index', color: 'rgba(150,200,170,0.5)' } },
              y: { grid: { color: C.grid }, ticks: { color: 'rgba(150,200,170,0.5)' }, title: { display: true, text: 'AQI Reduction', color: 'rgba(150,200,170,0.5)' }, min: 0 }
            }
          }
        });
      }

      sys5ScatterChart.data.datasets = [{
        label: `Interventions for ${zone.name}`,
        data: scatterPoints,
        backgroundColor: [C.accent, C.good, C.moderate, C.poor, C.vp, '#00D4A0'],
        pointRadius: 9, pointHoverRadius: 12,
      }];
      sys5ScatterChart.update();
    }
  }

  // Show a loading state while fetching
  function showLoadingState(zoneName) {
    if (aiBody) {
      aiBody.innerHTML = `
        <div class="ai-top-strat">
          <div class="ai-strat-label" style="animation:pulse 1.5s infinite;">⏳ Generating recommendations for ${zoneName}...</div>
          <div class="ai-strat-name" style="color:var(--text-muted);font-size:0.9rem;">Querying predictive model...</div>
        </div>`;
    }
    if (rl) rl.innerHTML = '<div style="color:var(--text-muted);padding:16px;text-align:center;font-size:0.85rem;">Loading recommendations...</div>';
  }

  // Main async function — API first, local fallback second
  async function generateAIRecommendations(zoneName) {
    const zone = zones.find(z => z.name === zoneName) || zones[0];
    if (!zone) return;

    showLoadingState(zone.name);

    try {
      // 1. Try Gemini via Backend API
      const res = await fetch(`${AIRNET_APIS.airnet.base}/policy/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneName: zone.name,
          aqi: zone.aqi,
          stress: zone.stress,
          spike: calcSpikeScore(zone),
          source: zone.source,
          vuln: zone.vuln
        })
      });
      const payload = await res.json();

      if (payload.success && payload.data) {
        renderRecommendations(zone, payload.data, payload.usedFallback);
        console.log(`[System 5] Recommendations loaded. Gemini used: ${!payload.usedFallback}`);
        return;
      }
    } catch (err) {
      console.warn('[System 5] Backend unreachable — using local scoring engine.', err.message);
    }

    // 2. Local fallback if API failed
    const trafficMod = (zone.source === 'Traffic') ? 1.5 : 0.8;
    const industryMod = (zone.source === 'Industry') ? 1.5 : 0.8;
    const constMod = (zone.source === 'Construction') ? 1.5 : 0.8;
    const severityMult = 1 + (zone.vuln / 100) * 0.5 + (zone.stress / 100) * 0.3;

    const scoredInterventions = interventions.map(inv => {
      let impactMod = 1.0;
      if (inv.type === 'traffic') impactMod = trafficMod;
      if (inv.type === 'industry') impactMod = industryMod;
      if (inv.type === 'construction' || inv.type === 'dust') impactMod = constMod;
      if (inv.type === 'hybrid') impactMod = Math.max(trafficMod, industryMod);
      const drop = Math.floor(zone.aqi * inv.baseImpact * impactMod * severityMult);
      const disrupt = Math.floor(inv.baseDisrupt * (zone.aqi > 350 ? 1.2 : 1.0));
      const efficiency = parseFloat((drop / (disrupt || 1)).toFixed(2));
      return { ...inv, drop, disrupt, efficiency };
    }).sort((a, b) => b.efficiency - a.efficiency);

    const top = scoredInterventions[0];
    const localData = {
      topStrategy: {
        name: top.name,
        description: `Targeted for ${zone.source}-heavy profile. Estimated ${top.drop} AQI unit drop based on vulnerability (${zone.vuln}) and stress index (${zone.stress}).`,
        expectedAqiDrop: top.drop,
        healthBenefit: top.drop > 50 ? 'High' : 'Moderate',
        confidence: 82,
        riskMitigation: Math.min(99, Math.round(70 + top.efficiency * 5)),
        sourceAlignment: `Strategy optimized for ${zone.source} as the primary pollutant source.`
      },
      rankedInterventions: scoredInterventions.slice(0, 4).map((inv, i) => ({
        rank: i + 1, name: inv.name,
        description: `Efficiency: ${inv.efficiency} AQI/disruption unit. Weighted for ${zone.source}-heavy profile.`,
        expectedAqiDrop: inv.drop, disruptionScore: inv.disrupt, efficiency: inv.efficiency
      })),
      scatterPoints: scoredInterventions.map(inv => ({
        x: inv.disrupt, y: inv.drop, label: inv.name.split(' (')[0].slice(0, 22)
      }))
    };
    renderRecommendations(zone, localData, true);
  }

  // Trigger initial render
  setTimeout(() => {
    if (zones && zones.length > 0) {
      const worstZone = zones.reduce((prev, curr) => (prev.aqi > curr.aqi) ? prev : curr);
      if (zSelect) zSelect.value = worstZone.name;
      generateAIRecommendations(worstZone.name);
    }
  }, 1000);
}

// Initialize System 5
initSystem5();




function matchZoneToRegion(zoneName, regionId) {
  const mapping = {
    central: ['Mandir Marg', 'Lodhi Road', 'India Gate', 'Connaught Place'],
    south: ['RK Puram', 'Saket', 'Kalkaji', 'Hauz Khas', 'Okhla'],
    north: ['Rohini', 'DTU', 'Jahangirpuri', 'Bawana', 'Timarpur', 'North Campus', 'Pitampura'],
    west: ['Punjabi Bagh', 'Harinagar', 'Paschim Vihar', 'Dwarka', 'Mundka', 'Najafgarh'],
    east: ['Anand Vihar', 'Shahdara', 'Mayur Vihar', 'Vasundhara', 'East Delhi Hub']
  };
  return mapping[regionId]?.includes(zoneName) || false;
}

// ============================================================================
// BOOT & INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // initNav() is now called at top level or here
  initSystem1();
  initSystem2();
  initSystem3();
  initSystem4();
  initSystem5();

  // Mobile Menu Toggle Logic
  const menuToggle = document.getElementById('menuToggle');
  const header = document.querySelector('.header');

  if (menuToggle && header) {
    menuToggle.addEventListener('click', () => {
      header.classList.toggle('nav-open');
    });
  }
});

// ============================================================================
// SYSTEM 04: CASCADE & INTERVENTION LAB
// ============================================================================
function initSystem4() {
  const zSelect = document.getElementById('sys4GlobalZoneSelector');
  const runBtn = document.getElementById('runCascade');
  const slTraffic = document.getElementById('slTraffic');
  const valTraffic = document.getElementById('valTraffic');
  const slIndustry = document.getElementById('slIndustry');
  const valIndustry = document.getElementById('valIndustry');
  const slHeavyVeh = document.getElementById('slHeavyVeh');
  const valHeavyVeh = document.getElementById('valHeavyVeh');
  const slDust = document.getElementById('slDust');
  const valDust = document.getElementById('valDust');
  const tgConstruction = document.getElementById('tgConstruction');

  const crAqiDrop = document.getElementById('crAqiDrop');
  const crHealth = document.getElementById('crHealth');
  const crDisruption = document.getElementById('crDisruption');
  const cascadeResult = document.getElementById('cascadeResult');
  const saveAction = document.getElementById('saveScenario');
  const tableBody = document.getElementById('scenarioTableBody');

  // Function to Populate Dropdown with all Zones
  window.populateSys4Dropdown = () => {
    if (zSelect) {
      const sortedZones = [...zones].sort((a, b) => b.aqi - a.aqi);
      console.log("[System 4] Populating dropdown with", sortedZones.length, "zones.");
      zSelect.innerHTML = sortedZones.map(z => `<option value="${z.name}">${z.name} (AQI: ${z.aqi})</option>`).join('');
    }
  };
  window.populateSys4Dropdown();

  // Toggles & Sliders UI sync
  let isConstructionHalt = false;
  if (tgConstruction) {
    tgConstruction.addEventListener('click', () => {
      isConstructionHalt = !isConstructionHalt;
      tgConstruction.classList.toggle('on', isConstructionHalt);
      // Removed automatic triggerSimulationUpdate();
    });
  }

  const syncVal = (sl, valEl) => {
    if (!sl || !valEl) return;
    sl.addEventListener('input', () => {
      valEl.innerText = sl.value + '%';
      // Removed automatic triggerSimulationUpdate();
    });
  };
  syncVal(slTraffic, valTraffic);
  syncVal(slIndustry, valIndustry);
  syncVal(slHeavyVeh, valHeavyVeh);
  syncVal(slDust, valDust);
  // Map Navigation on Dropdown Change (Using Delegation for Robustness)
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'sys4GlobalZoneSelector') {
      const selectedName = e.target.value;
      console.log("[System 4] Global Change Event - Selected:", selectedName);
      const selectedZone = zones.find(z => z.name === selectedName);

      if (selectedZone && window._s4MapBefore && window._s4MapAfter) {
        const target = { center: [selectedZone.lng, selectedZone.lat], zoom: 12.8 };
        console.log("[System 4] Flying maps to:", target.center);

        window._s4MapBefore.flyTo({
          center: target.center,
          zoom: target.zoom,
          speed: 1.0,
          curve: 1.2,
          essential: true
        });
        window._s4MapAfter.flyTo({
          center: target.center,
          zoom: target.zoom,
          speed: 1.0,
          curve: 1.2,
          essential: true
        });
      } else {
        console.warn("[System 4] Navigation failed - State:", {
          hasZone: !!selectedZone,
          hasMapBefore: !!window._s4MapBefore,
          hasMapAfter: !!window._s4MapAfter
        });
      }
    }
  });

  if (runBtn) runBtn.addEventListener('click', () => triggerSimulationUpdate(true));

  const regionCoords = {
    central: { center: [77.21, 28.61], zoom: 11.5 },
    south: { center: [77.21, 28.53], zoom: 11.5 },
    north: { center: [77.16, 28.71], zoom: 11.5 },
    west: { center: [77.08, 28.64], zoom: 11.5 },
    east: { center: [77.28, 28.63], zoom: 11.5 }
  };

  window._s4MapBefore = null;
  window._s4MapAfter = null;

  function initMaps() {
    if (window._s4MapBefore || window._s4MapAfter) return;

    const mapOptions = (container) => ({
      container: container,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: regionCoords.central.center,
      zoom: regionCoords.central.zoom,
      attributionControl: false,
      interactive: true
    });

    window._s4MapBefore = new maplibregl.Map(mapOptions('beforeMap'));
    window._s4MapAfter = new maplibregl.Map(mapOptions('afterMap'));

    const setupLayers = (m) => {
      m.on('load', () => {
        m.addSource('aqi-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        m.addLayer({
          id: 'aqi-heat',
          type: 'heatmap',
          source: 'aqi-source',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0, 400, 1],
            'heatmap-intensity': 1.5,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0, 255, 156, 0)',
              0.2, 'rgba(34, 197, 94, 0.5)',
              0.4, 'rgba(255, 181, 71, 0.6)',
              0.6, 'rgba(255, 140, 66, 0.7)',
              0.8, 'rgba(255, 77, 77, 0.8)',
              1, 'rgba(192, 38, 211, 0.9)'
            ],
            'heatmap-radius': 80,
            'heatmap-opacity': 0.7
          }
        });

        m.setLayoutProperty('aqi-heat', 'visibility', 'visible');

        if (zones.length) updateMapData();
      });

    };

    setupLayers(window._s4MapBefore);
    setupLayers(window._s4MapAfter);
  }

  function updateMapData(reductionPct = 0, regionalMetrics = null) {
    if (!window._s4MapBefore || !window._s4MapAfter) return;
    const s1 = window._s4MapBefore.getSource('aqi-source');
    const s2 = window._s4MapAfter.getSource('aqi-source');
    if (!s1 || !s2) return;

    const baselineSource = {
      type: 'FeatureCollection',
      features: zones.map(z => ({
        type: 'Feature',
        properties: { aqi: z.aqi },
        geometry: { type: 'Point', coordinates: [z.lng, z.lat] }
      }))
    };

    const intervenedSource = {
      type: 'FeatureCollection',
      features: zones.map(z => {
        const reg = regionalMetrics ? regionalMetrics.find(rm => rm.name === z.name) : null;
        const val = reg ? reg.projected_aqi : Math.max(20, z.aqi * (1 - reductionPct));
        return {
          type: 'Feature',
          properties: {
            aqi: val,
            disruption: reg ? reg.disruption : 0
          },
          geometry: { type: 'Point', coordinates: [z.lng, z.lat] }
        };
      })
    };

    window._s4MapBefore.getSource('aqi-source').setData(baselineSource);
    window._s4MapAfter.getSource('aqi-source').setData(intervenedSource);
  }
  window.updateMapDataSys4 = updateMapData;

  initMaps();

  let latestMetrics = null;

  async function triggerSimulationUpdate(isManualRun = false) {
    const selectedName = zSelect ? zSelect.value : (zones[0]?.name || '');
    const selectedZone = zones.find(z => z.name === selectedName) || zones[0];

    const baselineAqi = selectedZone ? selectedZone.aqi : 250;
    const windSpeed = window.__LIVE_WIND__ ? window.__LIVE_WIND__.speed : 3.2;

    // ── Pre-fetch 60-day historical baseline ─────────────────────────
    // Non-blocking: if unavailable, simulation falls back to live AQI only.
    let historicalFields = {};
    try {
      const histRes = await fetch(
        `${AIRNET_APIS.airnet.base}/analytics/zone-history?zone=${encodeURIComponent(selectedName)}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.success && histData.data_available && histData.historical) {
          const h = histData.historical;
          historicalFields = {
            historical_avg_aqi: h.avg_aqi,
            historical_peak_aqi: h.peak_aqi,
            historical_avg_wind: h.avg_wind_speed,
            historical_trend: h.trend,
            historical_days: histData.days,
          };
          console.log(`[Sim] 60d history for ${selectedName}: avg=${h.avg_aqi}, peak=${h.peak_aqi}, trend=${h.trend}`);
        }
      }
    } catch (_) {
      // Silently fall back — live AQI baseline will be used
    }

    const payload = {
      current_AQI: Math.round(baselineAqi),
      forecasted_AQI: Math.round(baselineAqi),
      wind_speed: windSpeed,
      population_density: ZONE_DENSITY_K[selectedName] ?? 11320,
      zones: zones.map(z => ({ name: z.name, aqi: z.aqi, vuln: z.vuln })),
      heavy_vehicle_restriction: slHeavyVeh ? slHeavyVeh.value : 0,
      industrial_emission_cap: slIndustry ? slIndustry.value : 0,
      traffic_flow_reduction: slTraffic ? slTraffic.value : 0,
      dust_mitigation_intensity: slDust ? slDust.value : 0,
      construction_halt: isConstructionHalt,
      ...historicalFields  // 60-day calibration fields (empty obj if no data)
    };

    try {
      if (isManualRun && runBtn) runBtn.innerText = "Simulating...";

      const res = await fetch(`${AIRNET_APIS.airnet.base}/simulate/simulate-policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (isManualRun && runBtn) runBtn.innerText = "▶ Run Simulation";

      if (data.success) {
        latestMetrics = data.metrics;

        if (cascadeResult) cascadeResult.style.display = 'block';
        if (crAqiDrop) crAqiDrop.innerText = `-${data.metrics.AQI_drop}`;
        if (crHealth) crHealth.innerText = data.metrics.health_risk_level;

        // Find Local Disruption for the selected Zone if available
        const localMetric = data.metrics.regional_metrics ? data.metrics.regional_metrics.find(m => m.name === selectedName) : null;
        if (crDisruption) {
          const disruptVal = localMetric ? localMetric.disruption : data.metrics.stress_index;
          crDisruption.innerText = `${disruptVal}/100`;
        }

        const dropPct = data.metrics.AQI_drop / baselineAqi;
        updateMapData(dropPct, data.metrics.regional_metrics);
      }
    } catch (e) {
      console.error("[System 4 API Error]", e);
      if (isManualRun && runBtn) runBtn.innerText = "▶ Run Simulation";
    }
  }



  // Save Scenario to Log Table
  let scCount = 1;
  let savedScenarios = []; // Store full state of each saved scenario

  if (saveAction && tableBody) {
    saveAction.addEventListener('click', () => {
      if (!latestMetrics) return;

      const selectedName = zSelect ? zSelect.value : '';
      const localMetric = latestMetrics.regional_metrics ? latestMetrics.regional_metrics.find(m => m.name === selectedName) : null;
      const disruptVal = localMetric ? localMetric.disruption : latestMetrics.stress_index;

      // Capture current UI and backend state
      const scenarioState = {
        id: scCount,
        zoneName: selectedName || 'NCR Average',
        baselineAqi: zones.find(z => z.name === selectedName)?.aqi || 250,
        metrics: latestMetrics,
        sliders: {
          traffic: slTraffic ? slTraffic.value : 0,
          industry: slIndustry ? slIndustry.value : 0,
          heavyVeh: slHeavyVeh ? slHeavyVeh.value : 0,
          dust: slDust ? slDust.value : 0,
          constructionHalt: isConstructionHalt
        },
        dropPct: latestMetrics.AQI_drop / (zones.find(z => z.name === selectedName)?.aqi || 250)
      };

      const index = savedScenarios.length;
      savedScenarios.push(scenarioState);

      const tr = document.createElement('tr');
      tr.className = 'scenario-row';
      tr.style.cursor = 'pointer';
      tr.dataset.index = index;
      tr.innerHTML = `
        <td>Scenario 0${scCount++}</td>
        <td>${scenarioState.zoneName}</td>
        <td style="color:var(--aqi-good); font-weight:bold;">-${latestMetrics.AQI_drop}</td>
        <td>${latestMetrics.health_risk_level}</td>
        <td style="color:var(--aqi-moderate);">${disruptVal}/100</td>
        <td>
          <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:2px;">Eff: ${100 - disruptVal}%</div>
          <div class="c-bar" style="width:${Math.max(0, 100 - disruptVal)}%; background:var(--accent); height:6px; border-radius:4px;"></div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Event delegation for clicking on a scenario row to load it
    tableBody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr.scenario-row');
      if (!tr) return;

      const index = parseInt(tr.dataset.index, 10);
      const state = savedScenarios[index];
      if (!state) return;

      // Highlight row
      tableBody.querySelectorAll('tr').forEach(row => row.style.background = 'transparent');
      tr.style.background = 'rgba(0, 255, 156, 0.1)';

      // 1. Restore Sliders
      if (slTraffic) { slTraffic.value = state.sliders.traffic; valTraffic.innerText = slTraffic.value + '%'; }
      if (slIndustry) { slIndustry.value = state.sliders.industry; valIndustry.innerText = slIndustry.value + '%'; }
      if (slHeavyVeh) { slHeavyVeh.value = state.sliders.heavyVeh; valHeavyVeh.innerText = slHeavyVeh.value + '%'; }
      if (slDust) { slDust.value = state.sliders.dust; valDust.innerText = slDust.value + '%'; }

      if (tgConstruction) {
        isConstructionHalt = state.sliders.constructionHalt;
        tgConstruction.classList.toggle('on', isConstructionHalt);
      }

      // 2. Restore Zone Selection and trigger map view changes
      if (zSelect && zSelect.value !== state.zoneName) {
        zSelect.value = state.zoneName;
        // Manually trigger the 'change' event to update the maps' flyTo
        zSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 3. Restore Results UI
      cascadeResult.style.display = 'block';
      if (crAqiDrop) crAqiDrop.innerText = `-${state.metrics.AQI_drop}`;
      if (crHealth) crHealth.innerText = state.metrics.health_risk_level;

      const localMetric = state.metrics.regional_metrics ? state.metrics.regional_metrics.find(m => m.name === state.zoneName) : null;
      if (crDisruption) {
        const disruptVal = localMetric ? localMetric.disruption : state.metrics.stress_index;
        crDisruption.innerText = `${disruptVal}/100`;
      }

      // 4. Restore Map Data explicitly for this scenario's results
      updateMapData(state.dropPct, state.metrics.regional_metrics);

      // Update the global latestMetrics so if they save it again it works (though redundant)
      latestMetrics = state.metrics;
    });
  }

  // Removed final automatic triggerSimulationUpdate()
  // setTimeout(() => triggerSimulationUpdate(false), 500);
}

initSystem4();
