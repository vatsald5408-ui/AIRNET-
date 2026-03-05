/* ============================================================
   AIRNET — Combined Server (API + Static Frontend)
   Single entry point for local dev and Render deployment
   ============================================================ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const db = require('./models/index');

const app = express();
// Priority: Render's PORT -> env API_PORT -> 4000
const PORT = process.env.PORT || process.env.API_PORT || 4000;

/* ── Core Middleware ─────────────────────────────────────── */
app.use(helmet({
    contentSecurityPolicy: false // Allow CDN scripts (Chart.js, MapLibre)
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

/* ── Static Frontend Files ───────────────────────────────── */
// Serve all files in the root directory as static assets
app.use(express.static(path.join(__dirname)));

/* ── Frontend Routes ─────────────────────────────────────── */
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'home.html')));
app.get('/dashboard', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

/* ── API Routes ──────────────────────────────────────────── */
app.use('/api/v1/simulate', require('./api/simulate'));
app.use('/api/v1/sensors', require('./api/sensors'));
app.use('/api/v1/analytics', require('./api/analytics'));
app.use('/api/v1/policy', require('./api/policy'));
app.use('/api/v1/reports', require('./api/reports'));

/* ── Health Check ────────────────────────────────────────── */
app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'operational', timestamp: new Date().toISOString() });
});

/* ── Global Error Handler ────────────────────────────────── */
app.use((err, _req, res, _next) => {
    console.error('[API Error]', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_ERROR'
    });
});

/* ── Bootstrap ───────────────────────────────────────────── */
const { syncWAQIData } = require('./utils/waqiService');

(async () => {
    await db.init();
    app.listen(PORT, async () => {
        console.log(`\n AIRNET running → http://localhost:${PORT}`);
        console.log(` Dashboard       → http://localhost:${PORT}/dashboard`);
        console.log(` API             → http://localhost:${PORT}/api/v1`);
        console.log(` Health check    → http://localhost:${PORT}/api/v1/health\n`);

        if (process.env.WAQI_API_KEY) {
            console.log('[WAQI] Running initial data sync...');
            await syncWAQIData().catch(e => console.error('[WAQI] Initial sync error:', e.message));

            setInterval(async () => {
                console.log('[WAQI] Running scheduled sync...');
                await syncWAQIData().catch(e => console.error('[WAQI] Scheduled sync error:', e.message));
            }, 30 * 60 * 1000);
        } else {
            console.log('[WAQI] No API key — using local data only.');
        }
    });
})();
