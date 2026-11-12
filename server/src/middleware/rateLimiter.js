// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const generalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  parseInt(process.env.RATE_LIMIT_MAX) || 200,
  'Too many requests. Please try again later.'
);

const authLimiter = createLimiter(
  15 * 60 * 1000,  // 15 min
  20,
  'Too many login attempts. Please try again in 15 minutes.'
);

const optimizerLimiter = createLimiter(
  5 * 60 * 1000,   // 5 min
  10,
  'Too many optimization requests. Please wait before trying again.'
);

module.exports = { generalLimiter, authLimiter, optimizerLimiter };
