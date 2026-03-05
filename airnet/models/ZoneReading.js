/* ==========================================================
   ZoneReading — SQLite model for per-zone atmospheric history
   Written every WAQI sync cycle (30 min) for trend analysis
   ========================================================== */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ZoneReading = sequelize.define('ZoneReading', {

    // ── Identity ───────────────────────────────────────────
    zone: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Zone name e.g. "Rohini", "Gurugram"'
    },

    ts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Unix timestamp (seconds) of the reading'
    },

    // ── Core air quality ───────────────────────────────────
    aqi: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    pm25: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    pm10: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    no2: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    so2: {
        type: DataTypes.FLOAT,
        allowNull: true
    },

    // ── Meteorology ────────────────────────────────────────
    wind_speed: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'km/h'
    },
    wind_dir: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'degrees'
    },

    // ── Derived/computed scores ────────────────────────────
    stress: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'ASI stress score 0-100'
    },
    spike_pct: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Spike probability 0-100'
    },
    vuln: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Vulnerability index 0-100'
    },
    primary_source: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: 'Dominant source: Traffic | Industry | Construction | External'
    }

}, {
    tableName: 'zone_readings',
    timestamps: false,          // we manage ts ourselves
    indexes: [
        { fields: ['zone', 'ts'] },   // fast zone+time range queries
        { fields: ['ts'] }            // global time-range queries
    ]
});

module.exports = ZoneReading;
