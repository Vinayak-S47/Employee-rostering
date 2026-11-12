// src/config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const autoSeedIfEmpty = async () => {
  try {
    const Department = require('../models/Department');
    const deptCount = await Department.countDocuments();
    if (deptCount === 0) {
      logger.info('No departments found in database. Running initial hospital seed...');
      const { seedData } = require('../../scripts/seed');
      await seedData(true);
      logger.info('Sample hospital workforce data automatically seeded.');
    }
  } catch (err) {
    logger.warn(`Auto-seed check warning: ${err.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
      socketTimeoutMS: 15000,
    });
    logger.info(`MongoDB connected to external instance: ${conn.connection.host}`);
    await autoSeedIfEmpty();
  } catch (error) {
    logger.warn(`External MongoDB connection failed (${error.message}). Initializing embedded database fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      logger.info(`Embedded MongoDB memory instance connected: ${uri}`);

      // Auto-populate demo dataset
      const { seedData } = require('../../scripts/seed');
      await seedData(true);
      logger.info('Sample hospital workforce data automatically seeded into embedded database.');
    } catch (memErr) {
      logger.error(`Failed to initialize embedded MongoDB: ${memErr.message}`);
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

module.exports = connectDB;
