/**
 * ============================================================================
 * AIRNET - SYSTEM 04: Cascade & Intervention Policy Simulation Engine
 * ============================================================================
 * Fast, deterministic calculation engine for real-time hackathon demos.
 * Processes 5 slider weights + baseline environmental telemetry to forecast 
 * absolute systemic outcomes under simulated government action.
 * Response constraint: < 200ms
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
console.log("[Simulator Router] Loading simulation routes...");


// Load deterministic impact weights
const weightsPath = path.join(__dirname, '../config/impactWeights.json');
let impactWeights = {
    traffic: 0.32,
    industrial: 0.28,
    heavyVehicle: 0.18,
    dust: 0.12,
    construction: 0.10
};

try {
    if (fs.existsSync(weightsPath)) {
        impactWeights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    }
} catch (e) {
    console.error('[Simulator] Failed to load impactWeights.json, using defaults.', e);
}

/**
 * Normalizes an intervention value from 0-100 to a 0-1 multiplier.
 */
const normalize = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(100, num)) / 100;
};

/**
 * Calculates attenuation based on wind speed.
 * High winds help clear pollution faster, making interventions slightly more effective at dispersing plumes.
 */
const windFactor = (windSpeed) => {
    const speed = parseFloat(windSpeed);
    if (isNaN(speed) || speed < 0) return 1.0;

    // Base 1.0 at 0m/s. Increases impact curve logarithmically as wind blows pollution away.
    // e.g. 5 m/s wind = ~1.15 multiplier on the drop efficiency
    return 1.0 + (Math.log10(speed + 1) * 0.2);
};

/**
 * Maps final AQI to WHO-standard health categories
 */
const getHealthRiskLevel = (aqi) => {
    if (aqi <= 50) return 'Low';
    if (aqi <= 100) return 'Moderate';
    return 'High';
};

/**
 * Maps AQI to population exposure fraction based on density
 */
const getExposureMultiplier = (aqi) => {
    if (aqi <= 50) return 0.05;   // Sensitive groups only
    if (aqi <= 100) return 0.20;  // Pre-existing conditions
    if (aqi <= 200) return 0.60;  // Broad exposure warning
    if (aqi <= 300) return 0.85;  // Hazardous to most
    return 1.00;                  // Universal exposure matrix
};


/* ─────────────────────────────────────────────────────────
   POST /api/v1/simulate-policy
   ───────────────────────────────────────────────────────── */
router.post('/simulate-policy', (req, res) => {
    const startObj = process.hrtime();

    try {
        // 1. Parse Input Defaults (Fail-safe parsing)
        const inputs = req.body || {};

        // System telemetry
        const current_AQI = parseFloat(inputs.current_AQI) || 150;
        const wind_speed = parseFloat(inputs.wind_speed) || 2.5;
        const population_density = parseFloat(inputs.population_density) || 11320;

        // ── Historical calibration (60-day window) ────────────────────────────
        // When the frontend passes historical data from /analytics/zone-history,
        // we blend the live AQI with the 60-day average to produce a more
        // representative baseline rather than relying on a single snapshot.
        const hist_avg = parseFloat(inputs.historical_avg_aqi) || 0;
        const hist_peak = parseFloat(inputs.historical_peak_aqi) || 0;
        const hist_wind = parseFloat(inputs.historical_avg_wind) || 0;
        const hist_trend = inputs.historical_trend || 'stable'; // 'worsening'|'improving'|'stable'
        const hist_days = parseInt(inputs.historical_days) || 0;

        let forecasted_AQI;
        if (hist_avg > 0) {
            // Blend live reading (60%) with 60-day average (40%) for a robust baseline
            const blended = current_AQI * 0.60 + hist_avg * 0.40;

            // Apply trend pressure:
            // - worsening trend → add up to 8% headroom (the zone is under rising stress)
            // - improving trend → subtract up to 5% (conditions are naturally easing)
            const trendOffset = hist_trend === 'worsening' ? blended * 0.08
                : hist_trend === 'improving' ? blended * -0.05
                    : 0;

            // Peak exposure factor: if historical peak >> avg, zone has volatile spikes
            // Add a small volatility buffer (proportional to peak-to-avg ratio)
            const volatilityBuffer = hist_peak > 0
                ? Math.min(15, (hist_peak - hist_avg) * 0.06)
                : 0;

            forecasted_AQI = Math.round(Math.min(500, Math.max(10,
                blended + trendOffset + volatilityBuffer
            )));

            console.log(`[Sim] Zone baseline calibrated: live=${current_AQI}, hist60d=${Math.round(hist_avg)}, blended=${Math.round(blended)}, trend=${hist_trend}, forecasted=${forecasted_AQI}`);
        } else {
            // No history available — use live AQI directly (old behaviour)
            forecasted_AQI = parseFloat(inputs.forecasted_AQI) || current_AQI;
        }

        // Use historical average wind if available and frontend didn't provide a live reading
        const effective_wind = hist_wind > 0 && wind_speed === 2.5
            ? (wind_speed * 0.5 + hist_wind * 0.5)
            : wind_speed;

        // Intervention Sliders (0-100)
        const heavy_veh = inputs.heavy_vehicle_restriction !== undefined ? normalize(inputs.heavy_vehicle_restriction) : 0;
        const ind_cap = inputs.industrial_emission_cap !== undefined ? normalize(inputs.industrial_emission_cap) : 0;
        const trf_red = inputs.traffic_flow_reduction !== undefined ? normalize(inputs.traffic_flow_reduction) : 0;
        const dust_mit = inputs.dust_mitigation_intensity !== undefined ? normalize(inputs.dust_mitigation_intensity) : 0;
        const cx_halt = inputs.construction_halt === true || inputs.construction_halt === 'true' ? 1.0 : 0;

        // 2. Execute Deterministic Model
        // Calculate raw drop components based on the weight matrix
        const drops = {
            heavyVehicle: heavy_veh * impactWeights.heavyVehicle,
            industrial: ind_cap * impactWeights.industrial,
            traffic: trf_red * impactWeights.traffic,
            dust: dust_mit * impactWeights.dust,
            construction: cx_halt * impactWeights.construction
        };

        // Find the top contributing sector for explainability logs
        let top_contributor = 'None';
        let max_drop = 0;
        for (const [key, value] of Object.entries(drops)) {
            if (value > max_drop) {
                max_drop = value;
                top_contributor = key;
            }
        }

        // Aggregate total raw reduction power (0 to 1.0 fraction of theoretically possible drop)
        const total_reduction_power = Object.values(drops).reduce((a, b) => a + b, 0);

        // Calculate actual AQI points dropped.
        // We assume maximum aggressive policy implementation can theoretically chop 60% off the total AQI.
        const MAXIMUM_THEORETICAL_DROP_PCT = 0.60;
        let delta_AQI = forecasted_AQI * MAXIMUM_THEORETICAL_DROP_PCT * total_reduction_power;

        // Apply meteorological wind factor adjustment (wind magnifies dispersion speed)
        delta_AQI = delta_AQI * windFactor(effective_wind);

        // Clamp projected AQI
        let projected_AQI = forecasted_AQI - delta_AQI;
        projected_AQI = Math.max(0, Math.min(500, projected_AQI));

        // Format to integers
        delta_AQI = Math.round(forecasted_AQI - projected_AQI);
        projected_AQI = Math.round(projected_AQI);

        // 3. Calculate Secondary Indexes
        // Stress Index: How badly is the city hurting (0-100)
        // High AQI + High Density = Max Stress
        const normalized_density = Math.min(1.0, population_density / 25000); // Normalize against super-dense threshold
        const raw_stress = (projected_AQI / 500) * normalized_density * 100;
        const stress_index = Math.round(Math.max(0, Math.min(100, raw_stress)));

        // Health & Demographics
        const health_risk_level = getHealthRiskLevel(projected_AQI);
        const exposure_fraction = getExposureMultiplier(projected_AQI);
        // Assumes city pop = density * 100km2 arbitrary area for demo visualization scale
        const population_exposed = Math.round((population_density * 100) * exposure_fraction);

        /**
         * NEW: Individual Regional Disruption Calculation (User Request)
         * We iterate through the provided zones to calculate a disruption score
         * that mixes intervention intensity with regional sensitivity (vuln).
         */
        const regional_metrics = (inputs.zones || []).map(z => {
            const sensitivity = (parseFloat(z.vuln) || 50) / 100;
            const baseline_aqi = parseFloat(z.aqi) || 150;
            // Disruption = Aggressiveness * Sensitivity (e.g. Traffic halt in sensitive zone is worse)
            const zone_disruption = Math.round(total_reduction_power * 100 * (0.6 + sensitivity * 0.4));

            // Local AQI improvement
            const drop_ratio = (forecasted_AQI > 0) ? (delta_AQI / forecasted_AQI) : 0;
            const new_aqi = Math.round(Math.max(20, baseline_aqi * (1 - drop_ratio)));

            return {
                name: z.name,
                disruption: Math.min(100, zone_disruption),
                projected_aqi: new_aqi,
                health_improvement: `+${Math.round(baseline_aqi - new_aqi)} AQI Points`
            };
        });

        // Simplified Health Benefit Label (User Request)
        const health_benefit_label = (delta_AQI > 40) ? "High Improvement" :
            (delta_AQI > 15) ? "Moderate Improvement" :
                (delta_AQI > 5) ? "Low Improvement" : "No Change";

        // Recovery Time (hours). 
        // Rough slope: We assume the atmosphere processes ~4 AQI pts per hour naturally. Intervention power accelerates this.
        let hours_to_stabilize = 0;
        if (delta_AQI > 0) {
            const atmospheric_clearance_rate = 4.0; // AQI/hour
            const intervention_speedup = 1 + (total_reduction_power * 2); // Up to 3x faster with extreme policy
            hours_to_stabilize = Math.round(delta_AQI / (atmospheric_clearance_rate * intervention_speedup));
            hours_to_stabilize = Math.max(1, hours_to_stabilize);
        }


        // Calculate execution time for debugging latency constraint
        const endObj = process.hrtime(startObj);
        const executionMs = (endObj[0] * 1000) + (endObj[1] / 1000000);

        // 4. Return Output
        res.json({
            success: true,
            execution_ms: parseFloat(executionMs.toFixed(3)),
            metrics: {
                projected_AQI,
                AQI_drop: delta_AQI,
                stress_index,
                health_risk_level: health_benefit_label,
                regional_metrics,
                population_exposed,
                recovery_time_estimate: hours_to_stabilize,
                top_contributing_intervention: top_contributor
            }
        });

    } catch (error) {
        console.error('[Sim API Error]', error);

        // Demo safety: always return safe defaults if it crashes
        res.json({
            success: false,
            error: 'Calculation error, returning defaults',
            metrics: {
                projected_AQI: 150,
                AQI_drop: 0,
                stress_index: 50,
                health_risk_level: 'Moderate Improvement',
                population_exposed: 0,
                recovery_time_estimate: 0,
                top_contributing_intervention: 'None'
            }
        });
    }
});

module.exports = router;
