/* ==========================================================
   /api/v1/sensors
   REAL DATA ONLY — no demo seeds
   ========================================================== */

const router = require('express').Router();
const { AtmosphericReading } = require('../models/index');
const { syncWAQIData } = require('../utils/waqiService');

/* ── POST /sync — Trigger a fresh CPCB sync ─────────────── */
router.post('/sync', async (req, res, next) => {
    try {
        const result = await syncWAQIData();
        res.json({
            success: true,
            message: result.success
                ? `Synced real-time WAQI readings for Delhi`
                : 'Failed to sync from WAQI',
            aqi: result.aqi,
            errors: result.error ? [result.error] : []
        });
    } catch (err) { next(err); }
});

/* ── GET /live?city_id=delhi — Latest real readings ──────── */
router.get('/live', async (req, res, next) => {
    try {
        const { city_id } = req.query;
        const where = city_id ? { city_id } : {};
        const readings = await AtmosphericReading.findAll({
            where,
            order: [['timestamp', 'DESC']],
            limit: 10
        });

        const now = Date.now();
        const annotated = readings.map(r => {
            const data = r.toJSON();
            if (data.ai_analysis) {
                try {
                    data.ai_analysis = JSON.parse(data.ai_analysis);
                } catch (e) {
                    console.error('Failed to parse ai_analysis for reading:', data.id);
                }
            }
            return {
                ...data,
                is_stale: (now - new Date(r.timestamp).getTime()) > 2 * 3600 * 1000
            };
        });

        res.json({ success: true, count: annotated.length, data: annotated });
    } catch (err) { next(err); }
});

module.exports = router;
