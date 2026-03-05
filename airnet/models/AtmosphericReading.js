const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AtmosphericReading = sequelize.define('AtmosphericReading', {
    pm25: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    pm10: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    no2: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    aqi_base: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    city_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sensor_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    ai_analysis: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        {
            fields: ['city_id', 'timestamp']
        }
    ]
});

module.exports = AtmosphericReading;
