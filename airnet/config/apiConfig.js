/* ==========================================================
   AirNet — config/apiConfig.js
   Single source of truth for all external API base URLs.
   Backend files: const APIS = require('../config/apiConfig');
   Frontend (app.js): AIRNET_APIS constant (inlined at top)
   ========================================================== */

const PORT_API = process.env.API_PORT || 4000;

const APIS = {
    // ── World Air Quality Index (WAQI / CPCB / DPCC) ──────────
    waqi: {
        base: 'https://api.waqi.info',
        // Feed: APIS.waqi.base + '/feed/<city>/?token=<key>'
        // Bounds: APIS.waqi.base + '/map/bounds/?latlng=...&token=<key>'
    },

    // ── Google Gemini Generative Language API ─────────────────
    gemini: {
        base: 'https://generativelanguage.googleapis.com/v1beta/models',
        // Usage: `${APIS.gemini.base}/${model}:generateContent?key=${key}`
        models: {
            primary: 'gemini-2.5-flash',
            fallback: 'gemini-2.0-flash',
        },
    },

    // ── Open-Meteo: Air Quality forecast (US-AQI hourly) ──────
    meteoAQ: {
        base: 'https://air-quality-api.open-meteo.com/v1/air-quality',
        // Usage: APIS.meteoAQ.base + '?latitude=...&longitude=...&hourly=us_aqi&...'
    },

    // ── Open-Meteo: Weather / Wind data ───────────────────────
    meteoWx: {
        base: 'https://api.open-meteo.com/v1/forecast',
        // Usage: APIS.meteoWx.base + '?latitude=...&longitude=...&current=wind_speed_10m,...'
    },

    // ── OpenStreetMap Overpass API (infrastructure queries) ───
    overpass: {
        base: 'https://overpass-api.de/api/interpreter',
    },

    // ── CARTO Map Tiles (MapLibre GL dark basemap) ────────────
    carto: {
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    },

    // ── AirNet local backend API ──────────────────────────────
    airnet: {
        base: `http://localhost:${PORT_API}/api/v1`,
    },
};

module.exports = APIS;
