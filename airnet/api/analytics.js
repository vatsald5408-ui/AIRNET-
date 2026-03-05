/* ==========================================================
   /api/v1/analytics
   Provides trend analysis and multi-city comparison data
   ========================================================== */

const router = require('express').Router();
const { AtmosphericReading } = require('../models/index');
const { Op, fn, col, literal } = require('sequelize');

/* ── Trend Analysis ──────────────────────────────────────── */
// GET /api/v1/analytics/trends?city_id=delhi&days=7
// Returns hourly-averaged AQI data for the specified period
router.get('/trends', async (req, res, next) => {
    try {
        const { city_id, days = 7 } = req.query;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const where = { timestamp: { [Op.gte]: since } };
        if (city_id) where.city_id = city_id;

        const readings = await AtmosphericReading.findAll({
            where,
            order: [['timestamp', 'ASC']],
            attributes: ['city_id', 'aqi_base', 'pm25', 'pm10', 'no2', 'timestamp']
        });

        res.json({ success: true, period_days: parseInt(days), count: readings.length, data: readings });
    } catch (err) { next(err); }
});

/* ── City Comparison Snapshot ───────────────────────────── */
// GET /api/v1/analytics/compare
// Returns latest AQI for all tracked cities for comparative view
router.get('/compare', async (req, res, next) => {
    try {
        const cities = ['delhi', 'mumbai', 'kolkata', 'bangalore', 'chennai', 'hyderabad', 'ahmedabad', 'pune', 'lucknow', 'kanpur', 'patna', 'agra'];

        const results = await Promise.all(cities.map(async city_id => {
            const latest = await AtmosphericReading.findOne({
                where: { city_id },
                order: [['timestamp', 'DESC']]
            });
            return { city_id, data: latest };
        }));

        // Rank by AQI descending (worst first)
        const ranked = results
            .filter(r => r.data)
            .sort((a, b) => b.data.aqi_base - a.data.aqi_base);

        res.json({ success: true, count: ranked.length, data: ranked });
    } catch (err) { next(err); }
});

/* ── Hotspot Detection ───────────────────────────────────── */
// GET /api/v1/analytics/hotspots?threshold=200
// Returns cities currently exceeding the given AQI threshold
router.get('/hotspots', async (req, res, next) => {
    try {
        const { threshold = 200 } = req.query;
        const cities = ['delhi', 'mumbai', 'kolkata', 'bangalore', 'chennai', 'hyderabad', 'ahmedabad', 'pune', 'lucknow', 'kanpur', 'patna', 'agra'];

        const hotspots = [];
        for (const city_id of cities) {
            const latest = await AtmosphericReading.findOne({
                where: { city_id },
                order: [['timestamp', 'DESC']]
            });
            if (latest && latest.aqi_base >= parseInt(threshold)) {
                hotspots.push({
                    city_id,
                    aqi: latest.aqi_base,
                    pm25: latest.pm25,
                    severity: latest.aqi_base >= 300 ? 'Hazardous' :
                        latest.aqi_base >= 250 ? 'Very Unhealthy' :
                            'Unhealthy'
                });
            }
        }
        hotspots.sort((a, b) => b.aqi - a.aqi);
        res.json({ success: true, threshold: parseInt(threshold), hotspots });
    } catch (err) { next(err); }
});

/* ── Zone Trend Analysis ─────────────────────────────────── */
// GET /api/v1/analytics/zone-trend?zone=Rohini&hours=24
// Returns trend metrics for a specific zone from zone_readings table
router.get('/zone-trend', async (req, res, next) => {
    try {
        const { zone, hours = 24 } = req.query;
        if (!zone) return res.status(400).json({ error: 'zone param required' });

        const { ZoneReading } = require('../models/index');
        const { Op, fn, col, literal } = require('sequelize');

        const sinceTs = Math.floor(Date.now() / 1000) - parseInt(hours) * 3600;
        const since30d = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;

        // Readings in requested window
        const recent = await ZoneReading.findAll({
            where: { zone, ts: { [Op.gte]: sinceTs } },
            order: [['ts', 'ASC']],
            attributes: ['ts', 'aqi', 'pm25', 'pm10', 'no2', 'stress', 'spike_pct']
        });

        if (recent.length === 0) {
            return res.json({ success: true, zone, hours: parseInt(hours), data_available: false });
        }

        const aqiValues = recent.map(r => r.aqi).filter(Boolean);
        const avgAqi = aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length;
        const peakAqi = Math.max(...aqiValues);

        // Rate of change: slope between first and last reading (AQI/hr)
        const first = recent[0], last = recent[recent.length - 1];
        const deltaHrs = Math.max(0.5, (last.ts - first.ts) / 3600);
        const rateAqiPerHr = ((last.aqi - first.aqi) / deltaHrs).toFixed(2);

        // Hours where AQI > 200
        const hoursElevated = recent.filter(r => r.aqi >= 200).length * (30 / 60); // 30-min intervals

        // 30-day baseline
        const baseline30d = await ZoneReading.findAll({
            where: { zone, ts: { [Op.gte]: since30d } },
            attributes: [[fn('AVG', col('aqi')), 'avg_aqi'],
            [fn('MAX', col('aqi')), 'peak_aqi'],
            [fn('COUNT', col('id')), 'reading_count']]
        });
        const b = baseline30d[0]?.dataValues || {};

        res.json({
            success: true,
            zone,
            hours: parseInt(hours),
            data_available: true,
            trend: {
                avg_aqi: Math.round(avgAqi),
                peak_aqi: Math.round(peakAqi),
                current_aqi: Math.round(last.aqi),
                rate_per_hr: parseFloat(rateAqiPerHr),
                direction: parseFloat(rateAqiPerHr) > 2 ? 'rising' : parseFloat(rateAqiPerHr) < -2 ? 'improving' : 'stable',
                hours_elevated: Math.round(hoursElevated),
                reading_count: recent.length
            },
            baseline_30d: {
                avg_aqi: b.avg_aqi ? Math.round(parseFloat(b.avg_aqi)) : null,
                peak_aqi: b.peak_aqi ? Math.round(parseFloat(b.peak_aqi)) : null,
                reading_count: parseInt(b.reading_count) || 0
            }
        });
    } catch (err) { next(err); }
});

/* ── Zone 60-Day History (Simulation Baseline) ────────── */
// GET /api/v1/analytics/zone-history?zone=Rohini
// Returns 60-day stats to calibrate the policy simulation baseline.
// Called by the frontend before running a simulation.
router.get('/zone-history', async (req, res, next) => {
    try {
        const { zone } = req.query;
        if (!zone) return res.status(400).json({ error: 'zone param required' });

        const { ZoneReading } = require('../models/index');
        const { Op, fn, col } = require('sequelize');

        const DAYS = 60;
        const since60d = Math.floor(Date.now() / 1000) - DAYS * 24 * 3600;

        // Aggregate stats over 60 days in one query
        const stats = await ZoneReading.findOne({
            where: { zone, ts: { [Op.gte]: since60d } },
            attributes: [
                [fn('AVG', col('aqi')), 'avg_aqi'],
                [fn('MAX', col('aqi')), 'peak_aqi'],
                [fn('MIN', col('aqi')), 'min_aqi'],
                [fn('AVG', col('stress')), 'avg_stress'],
                [fn('AVG', col('spike_pct')), 'avg_spike'],
                [fn('AVG', col('wind_speed')), 'avg_wind'],
                [fn('COUNT', col('id')), 'reading_count']
            ],
            raw: true
        });

        const count = parseInt(stats?.reading_count) || 0;

        if (count === 0) {
            return res.json({
                success: true, zone, days: DAYS,
                data_available: false,
                message: 'No historical data yet — using live AQI as baseline.'
            });
        }

        const avg = parseFloat(stats.avg_aqi) || 0;
        const peak = parseFloat(stats.peak_aqi) || 0;
        const min = parseFloat(stats.min_aqi) || 0;

        // Count distinct days where avg AQI was > 200
        const highPollutionRows = await ZoneReading.count({
            where: { zone, ts: { [Op.gte]: since60d }, aqi: { [Op.gte]: 200 } }
        });
        // Each reading = 30 min, so readings / 2 ≈ hours; / 24 ≈ days
        const highPollutionDays = Math.round(highPollutionRows / 48);

        // Trend direction based on split: compare first 30d avg vs last 30d avg
        const mid = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
        const [first30, last30] = await Promise.all([
            ZoneReading.findOne({
                where: { zone, ts: { [Op.gte]: since60d, [Op.lt]: mid } },
                attributes: [[fn('AVG', col('aqi')), 'avg']],
                raw: true
            }),
            ZoneReading.findOne({
                where: { zone, ts: { [Op.gte]: mid } },
                attributes: [[fn('AVG', col('aqi')), 'avg']],
                raw: true
            })
        ]);

        const avg1 = parseFloat(first30?.avg) || avg;
        const avg2 = parseFloat(last30?.avg) || avg;
        const trend = avg2 > avg1 + 5 ? 'worsening' : avg2 < avg1 - 5 ? 'improving' : 'stable';
        const trendDelta = Math.round(avg2 - avg1);

        res.json({
            success: true,
            zone,
            days: DAYS,
            data_available: true,
            reading_count: count,
            historical: {
                avg_aqi: Math.round(avg),
                peak_aqi: Math.round(peak),
                min_aqi: Math.round(min),
                avg_stress: Math.round(parseFloat(stats.avg_stress) || 0),
                avg_spike_pct: Math.round(parseFloat(stats.avg_spike) || 0),
                avg_wind_speed: parseFloat((parseFloat(stats.avg_wind) || 3.0).toFixed(1)),
                high_pollution_days: highPollutionDays,
                trend,
                trend_delta_aqi: trendDelta   // positive = getting worse
            }
        });
    } catch (err) { next(err); }
});

module.exports = router;
