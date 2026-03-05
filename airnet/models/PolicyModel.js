const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Policy = sequelize.define('Policy', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    target_sector: {
        type: DataTypes.ENUM('Transport', 'Industrial', 'Waste', 'Energy', 'Multi'),
        defaultValue: 'Multi'
    },
    intensity: {
        type: DataTypes.FLOAT, // 0.0 to 1.0
        defaultValue: 0.5
    },
    status: {
        type: DataTypes.ENUM('Draft', 'Active', 'Archived'),
        defaultValue: 'Draft'
    }
});

module.exports = Policy;
