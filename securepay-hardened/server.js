require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const connectDB = require('./config/db');
const { logger } = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ── Connect Database ──────────────────────────
connectDB();

const app = express();

// ── Security Middleware ───────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // Disabled for development; enable in production
  })
);

// ── CORS ──────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Postman, file://)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin} is not allowed.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// ── Body Parsers ──────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── HTTP Request Logging ──────────────────────
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) }
  })
);

// ── Global Rate Limiter ───────────────────────
app.use('/api', apiLimiter);

// ── Serve Frontend Static Files ───────────────
app.use(express.static(path.join(__dirname, 'frontend')));

// ── API Routes ────────────────────────────────
app.use('/api', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api', require('./routes/transactions'));
app.use('/api', require('./routes/security'));

// ── Health Check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'SecurePay API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ── Catch-all: serve frontend SPA ────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ── Error Handlers ────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 SecurePay server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
