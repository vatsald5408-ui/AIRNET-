const sequelize = require('../config/database');
const AtmosphericReading = require('./AtmosphericReading');
const ZoneReading = require('./ZoneReading');
const Policy = require('./PolicyModel');
const ImpactSimulation = require('./ImpactSimulation');

// Associations
Policy.hasMany(ImpactSimulation, { foreignKey: 'policy_id' });
ImpactSimulation.belongsTo(Policy, { foreignKey: 'policy_id' });

const db = {
    sequelize,
    Sequelize: require('sequelize'),
    AtmosphericReading,
    ZoneReading,
    Policy,
    ImpactSimulation
};

// Sync database (creates tables if not exists)
db.init = async () => {
    try {
        await sequelize.sync({ alter: true }); // Automatically adds missing columns
        console.log('Database synchronized successfully.');
    } catch (error) {
        console.error('Error synchronizing database:', error);
    }
};

module.exports = db;
