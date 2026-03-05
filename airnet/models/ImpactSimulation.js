const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ImpactSimulation = sequelize.define('ImpactSimulation', {
    policy_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    city_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    baseline_aqi: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    predicted_aqi: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    confidence_score: {
        type: DataTypes.FLOAT,
        defaultValue: 0.9
    },
    impact_summary: {
        type: DataTypes.TEXT
    },
    simulation_params: {
        type: DataTypes.JSON // To store specific wind/intensity params used
    }
});

module.exports = ImpactSimulation;
