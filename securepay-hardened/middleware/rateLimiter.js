const rateLimit = require('express-rate-limit');
const SecurityEvent = require('../models/SecurityEvent');
const { securityLogger } = require('../utils/logger');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  handler: async (req, res, next, options) => {
    securityLogger.warn(`Rate limit exceeded from IP ${req.ip} on ${req.originalUrl}`);
    try {
      await SecurityEvent.create({
        type: 'rate_limit_exceeded',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        description: `Rate limit exceeded on ${req.method} ${req.originalUrl}`,
        severity: 'medium'
      });
    } catch (_) {}
    res.status(options.statusCode).json(options.message);
  }
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  skipSuccessfulRequests: true, // Only count failed requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many failed attempts. Your IP is temporarily blocked for 15 minutes.'
  },
  handler: async (req, res, next, options) => {
    securityLogger.warn(`Auth brute-force suspected from IP ${req.ip}`);
    try {
      await SecurityEvent.create({
        type: 'brute_force',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        description: `Brute force suspected: ${req.method} ${req.originalUrl}`,
        severity: 'high'
      });
    } catch (_) {}
    res.status(options.statusCode).json(options.message);
  }
});

// Limiter for transfer endpoints
const transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many transfer requests. Please wait a moment.'
  }
});

module.exports = { apiLimiter, authLimiter, transferLimiter };
