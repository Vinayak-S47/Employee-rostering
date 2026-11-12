// src/utils/logger.js
const winston = require('winston');

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        simple()
      ),
    }),
  ],
});

// Sanitize: never log passwords or tokens
const sanitize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = { ...obj };
  ['password', 'token', 'secret', 'authorization'].forEach((key) => {
    if (sanitized[key]) sanitized[key] = '[REDACTED]';
  });
  return sanitized;
};

logger.sanitize = sanitize;

module.exports = logger;
