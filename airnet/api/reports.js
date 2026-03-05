/* ==========================================================
   /api/v1/reports
   Generates government-grade analytics summaries
   ========================================================== */

const router = require('express').Router();
const { Policy, ImpactSimulation, AtmosphericReading } = require('../models/index');

/* GET /api/v1/reports/summary
   Returns a complete analytical summary for briefings */
router.get('/summary', async (req, res, next) => {
    try {
        const { city_id } = req.query;

        // Aggregate: most recent readings
        const readings = await AtmosphericReading.findAll({
            where: city_id ? { city_id } : {},
            order: [['timestamp', 'DESC']],
            limit: 12
        });

        // Aggregate: policy stats
        const totalPolicies = await Policy.count();
        const activePolicies = await Policy.count({ where: { status: 'Active' } });
        const simulations = await ImpactSimulation.findAll({ order: [['createdAt', 'DESC']], limit: 5 });

        // Compute average AQI across readings
        const avgAqi = readings.length > 0
            ? Math.round(readings.reduce((s, r) => s + r.aqi_base, 0) / readings.length)
            : null;

        res.json({
            success: true,
            generated_at: new Date().toISOString(),
            summary: {
                avg_aqi: avgAqi,
                cities_monitored: [...new Set(readings.map(r => r.city_id))].length,
                total_policies: totalPolicies,
                active_policies: activePolicies,
                recent_readings: readings,
                recent_simulations: simulations
            }
        });
    } catch (err) { next(err); }
});

/* GET /api/v1/reports/policy/:id
   Returns a complete Before/After report for a given policy */
router.get('/policy/:id', async (req, res, next) => {
    try {
        const policy = await Policy.findByPk(req.params.id, {
            include: [{ model: ImpactSimulation }]
        });
        if (!policy) return res.status(404).json({ error: 'Policy not found' });

        res.json({
            success: true,
            generated_at: new Date().toISOString(),
            policy,
            simulations: policy.ImpactSimulations || []
        });
    } catch (err) { next(err); }
});

module.exports = router;
