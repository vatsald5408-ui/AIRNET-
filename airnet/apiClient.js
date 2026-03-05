/* ================================================================
   AIRNET — api.js
   Frontend API Client — connects dashboard to backend (port 4000)
   Handles: live sensor data, policy suggestion, impact simulation
   Auto-refreshes data every 5 minutes
   ================================================================ */

const API_BASE = '/api/v1';

/* ── Core fetch utility ─────────────────────────────────── */
async function apiFetch(path, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
        return await res.json();
    } catch (err) {
        console.warn(`[AIRNET API] ${err.message}`);
        return null;
    }
}

/* ── AQI label and color helpers ────────────────────────── */
function aqiLabel(v) {
    if (v <= 50) return { label: 'Good', color: '#22C55E' };
    if (v <= 100) return { label: 'Moderate', color: '#92CF5C' };
    if (v <= 200) return { label: 'High', color: '#FFB547' };
    return { label: 'Hazardous', color: '#C026D3' };
}

/* ================================================================
   SECTION 1 — Live Sensor Metrics
   Populates the top Stat Cards in System 1
   ================================================================ */
async function loadLiveSensorData() {
    const data = await apiFetch('/sensors/live?city_id=delhi');
    if (!data?.data?.length) return;

    const latest = data.data[0];
    const { label, color } = aqiLabel(latest.aqi_base);

    // AQI status text in the command bar
    const aqiEls = document.querySelectorAll('[data-live="aqi"]');
    aqiEls.forEach(el => {
        el.textContent = latest.aqi_base;
        el.style.color = color;
    });

    // PM2.5
    const pm25Els = document.querySelectorAll('[data-live="pm25"]');
    pm25Els.forEach(el => el.textContent = latest.pm25 + ' μg/m³');

    // NO2
    const no2Els = document.querySelectorAll('[data-live="no2"]');
    no2Els.forEach(el => el.textContent = latest.no2 + ' μg/m³');

    // AQI label chip
    const labelEls = document.querySelectorAll('[data-live="aqi-label"]');
    labelEls.forEach(el => {
        el.textContent = label;
        el.style.color = color;
        el.style.borderColor = color + '55';
    });

    // Update the ASI gauge computation with real AQI scale
    const normalizedAQI = Math.min(Math.round((latest.aqi_base / 500) * 100), 100);
    updateASIGauge(normalizedAQI);

    // Update page title chip if it exists
    const liveAqiChip = document.getElementById('liveAqiValue');
    if (liveAqiChip) {
        liveAqiChip.textContent = latest.aqi_base;
        liveAqiChip.style.color = color;
    }

    // Metric updates handled by app.js updateGlobalMetrics()

    console.log(`[AIRNET] Live Delhi AQI: ${latest.aqi_base} (${label}) PM2.5: ${latest.pm25}`);
}

/* ================================================================
   SECTION 2 — Update Zone AQI Map from real data
   Applies real Delhi AQI to specific zones that match real stations
   ================================================================ */
async function loadZoneOverlayData() {
    const data = await apiFetch('/sensors/live?city_id=delhi');
    if (!data?.data?.length) return;

    const latest = data.data[0];
    const baseAQI = latest.aqi_base;
    const pm25 = latest.pm25;

    // Distribute realistic variation around the real measured AQI baseline
    window.__LIVE_AQI_BASE__ = baseAQI;
    window.__LIVE_PM25_BASE__ = pm25;
    window.__LIVE_DATA_TS__ = new Date(latest.timestamp).toLocaleTimeString();


    // AI-Inferred Regional Data
    if (latest.ai_analysis && latest.ai_analysis.zones) {
        window.__LIVE_ZONE_DATA__ = latest.ai_analysis.zones;
        window.__LIVE_AI_SUMMARY__ = latest.ai_analysis.overall_summary;

        // Open-Meteo 24h Forecast Dataset
        if (latest.ai_analysis.forecast24h) {
            window.__LIVE_FORECAST__ = latest.ai_analysis.forecast24h;
        }

        if (latest.ai_analysis.wind_profile) {
            window.__LIVE_WIND__ = latest.ai_analysis.wind_profile;
        }

        // Trigger dashboard update
        if (window.applyAIRNETLiveData) {
            window.applyAIRNETLiveData();
        }
    }
}

/* ================================================================
   SECTION 3 — Policy System (System 5 / AI Policy Brain)
   Powers the "Suggest Policy" and "Run Simulation" interactions
   ================================================================ */

// Suggest policy using Gemini AI for Delhi
async function suggestPolicy(sector = 'Transport') {
    showPolicyLoading(true);

    const res = await apiFetch('/policy/suggest', {
        method: 'POST',
        body: JSON.stringify({ city_id: 'delhi', sector })
    });

    showPolicyLoading(false);

    if (!res?.data) {
        showPolicyError('AI service unavailable. Please retry.');
        return;
    }

    renderPolicyCard(res.data, res.trigger_aqi);
    return res.data;
}

// Simulate Before/After impact for a given policy ID
async function simulatePolicy(policyId) {
    const res = await apiFetch('/policy/simulate', {
        method: 'POST',
        body: JSON.stringify({ policy_id: policyId, city_id: 'delhi' })
    });

    if (!res?.before) return;
    renderSimulationResult(res);
}

// Get all saved policies
async function loadPolicies() {
    const res = await apiFetch('/policy');
    if (!res?.data) return [];
    renderPoliciesList(res.data);
    return res.data;
}

/* ================================================================
   SECTION 4 — Analytics (hotspots, trends passed to charts)
   ================================================================ */
async function loadHotspots() {
    const res = await apiFetch('/analytics/hotspots?threshold=150');
    // Rendering logic for hotspots is now handled dynamically in app.js
}

async function loadForecastData() {
    const res = await apiFetch('/analytics/trends?city_id=delhi&days=1');
    if (!res?.data?.length) return;

    // Extract time-series data for the forecast chart
    const readings = res.data.slice(-7);
    if (!readings.length) return;

    const labels = readings.map(r => {
        const t = new Date(r.timestamp);
        return t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0');
    });
    const aqiValues = readings.map(r => r.aqi_base);

    // Update the forecast chart if it exists
    if (window.forecastChart) {
        window.forecastChart.data.labels = labels;
        window.forecastChart.data.datasets[0].data = aqiValues;
        window.forecastChart.update();
    }
}

/* ================================================================
   RENDER HELPERS
   ================================================================ */

function updateASIGauge(normalizedScore) {
    // Override gauge value from live API
    const asiValueEl = document.getElementById('asiValue');
    if (asiValueEl) {
        asiValueEl.textContent = normalizedScore;
        if (normalizedScore > 70) asiValueEl.classList.add('pulse-glow');
    }
}

function showPolicyLoading(loading) {
    const btn = document.getElementById('policyGenerateBtn');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Generating...' : 'Generate AI Policy';
}

function showPolicyError(msg) {
    const el = document.getElementById('policyOutput');
    if (el) el.innerHTML = `<div class="policy-error">${msg}</div>`;
}

function renderPolicyCard(policy, triggerAQI) {
    const container = document.getElementById('aiActionBody') ||
        document.getElementById('policyOutput');
    if (!container) return;

    const badgeColor = policy.target_sector === 'Transport' ? '#FFB547' :
        policy.target_sector === 'Industrial' ? '#FF4D4D' :
            policy.target_sector === 'Waste' ? '#AA88FF' : '#00FF9C';

    container.innerHTML = `
        <div style="padding:4px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <span style="padding:3px 10px;font-size:0.65rem;font-weight:700;letter-spacing:0.08em;
                    border-radius:4px;background:${badgeColor}22;color:${badgeColor};border:1px solid ${badgeColor}44">
                    ${policy.target_sector.toUpperCase()}
                </span>
                <span style="font-size:0.65rem;color:#FFB547;margin-left:auto;">&#9673; DRAFT</span>
            </div>
            <h3 style="font-size:0.9rem;font-weight:600;color:#eaf7f0;margin-bottom:10px;line-height:1.4">
                ${policy.title}
            </h3>
            <p style="font-size:0.76rem;color:rgba(150,200,170,0.75);line-height:1.6;margin-bottom:14px;">
                ${policy.description}
            </p>
            <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:rgba(150,200,170,0.5);margin-bottom:14px;">
                <span>Triggered at AQI ${triggerAQI || window.__LIVE_AQI__ || '&mdash;'}</span>
                <span>Intensity: ${Math.round((policy.intensity || 0.7) * 100)}%</span>
            </div>
            <button id="simTriggerBtn" onclick="window.AIRNET.simulatePolicy(${policy.id})" style="
                width:100%;padding:10px;background:rgba(0,255,156,0.1);
                border:1px solid rgba(0,255,156,0.35);border-radius:8px;
                color:#00FF9C;font-size:0.8rem;font-weight:600;cursor:pointer;
                font-family:inherit;">
                Run Before/After Simulation &rarr;
            </button>
            <div id="simResultInline" style="margin-top:12px;"></div>
        </div>
    `;
}

function renderSimulationResult(result) {
    const container = document.getElementById('simResultInline') ||
        document.getElementById('simulationOutput');
    if (!container) return;

    const diff = result.before.aqi - result.after.aqi;
    const pct = result.after.reduction_pct;

    container.innerHTML = `
        <div style="padding:14px;background:rgba(0,255,156,0.05);border-radius:10px;border:1px solid rgba(0,255,156,0.15);">
            <div style="display:flex;justify-content:space-between;font-size:0.65rem;font-weight:700;
                letter-spacing:0.08em;color:rgba(150,200,170,0.5);margin-bottom:10px;">
                <span>BEFORE / AFTER</span>
                <span style="color:#00FF9C">Confidence: ${Math.round(result.confidence_score * 100)}%</span>
            </div>
            <div style="margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
                    <span style="font-size:0.68rem;color:rgba(150,200,170,0.5);width:40px;">Before</span>
                    <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:4px;height:20px;">
                        <div style="width:100%;height:100%;background:#FF4D4D55;border-radius:4px;display:flex;align-items:center;padding:0 8px;">
                            <span style="font-size:0.7rem;color:#FF4D4D;font-weight:700;">AQI ${result.before.aqi} &mdash; ${result.before.label}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:0.68rem;color:rgba(150,200,170,0.5);width:40px;">After</span>
                    <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:4px;height:20px;">
                        <div style="width:${(100 - pct).toFixed(0)}%;height:100%;background:rgba(0,255,156,0.3);border-radius:4px;display:flex;align-items:center;padding:0 8px;transition:width 1s;">
                            <span style="font-size:0.7rem;color:#00FF9C;font-weight:700;">AQI ${result.after.aqi}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div style="font-size:0.75rem;color:#00FF9C;font-weight:600;margin-bottom:5px;">&darr; ${diff} AQI points (${pct}% reduction)</div>
            <p style="font-size:0.71rem;color:rgba(150,200,170,0.6);line-height:1.5;margin:0;">${result.impact_summary}</p>
        </div>
    `;
}

function renderPoliciesList(policies) {
    // Populate System 5 ranked list
    const el = document.getElementById('rankedList') ||
        document.getElementById('policiesList');
    if (!el) return;

    if (!policies.length) {
        el.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <p style="font-size:0.78rem;color:rgba(150,200,170,0.4);margin-bottom:12px;">No AI policies generated yet.</p>
                <button onclick="window.AIRNET.suggestPolicy()" style="padding:8px 16px;background:rgba(0,255,156,0.1);
                    border:1px solid rgba(0,255,156,0.3);border-radius:6px;color:#00FF9C;
                    font-size:0.78rem;cursor:pointer;font-family:inherit;">
                    Generate First Policy
                </button>
            </div>`;
        return;
    }

    const sectors = ['Transport', 'Industrial', 'Energy', 'Waste', 'Multi'];

    el.innerHTML = policies.slice(0, 5).map((p, i) => {
        const badgeColor = p.target_sector === 'Transport' ? '#FFB547' :
            p.target_sector === 'Industrial' ? '#FF4D4D' :
                p.target_sector === 'Energy' ? '#60A5FA' :
                    p.target_sector === 'Waste' ? '#AA88FF' : '#00FF9C';
        const statusColor = p.status === 'Active' ? '#00FF9C' : p.status === 'Archived' ? '#666' : '#FFB547';
        return `
            <div onclick="window.AIRNET.simulatePolicy(${p.id})" style="
                display:flex;align-items:flex-start;gap:10px;padding:12px 0;
                border-bottom:1px solid rgba(0,255,156,0.06);cursor:pointer;
                transition:background 0.2s;" class="ranked-item">
                <span style="font-size:0.7rem;font-weight:700;color:rgba(150,200,170,0.3);min-width:16px;">${i + 1}</span>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:0.7rem;padding:1px 7px;border-radius:3px;
                            background:${badgeColor}18;color:${badgeColor};border:1px solid ${badgeColor}33;">${p.target_sector}</span>
                        <span style="font-size:0.68rem;color:${statusColor};">${p.status}</span>
                    </div>
                    <div style="font-size:0.8rem;color:#eaf7f0;font-weight:500;line-height:1.4;">${p.title}</div>
                </div>
            </div>
        `;
    }).join('');
}

/* ================================================================
   INIT — Boot API data layer on page load
   ================================================================ */
window.AIRNET = {
    suggestPolicy,
    simulatePolicy,
    loadPolicies
};

async function initAPIData() {
    console.log('[AIRNET] Initializing live API data layer...');

    // Parallel initial loads
    await Promise.allSettled([
        loadLiveSensorData(),
        loadZoneOverlayData(),
        loadHotspots(),
        loadPolicies(),
    ]);

    // Forecast data (sequential, depends on DB having readings)
    await loadForecastData();

    // Auto-refresh every 5 minutes
    setInterval(async () => {
        await loadLiveSensorData();
        await loadZoneOverlayData();
        await loadHotspots();
    }, 5 * 60 * 1000);

    console.log('[AIRNET] Live data layer active. Auto-refresh: every 5 min.');
}

// Boot after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAPIData);
} else {
    initAPIData();
}
