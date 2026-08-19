const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Morgan request logging, scrubbed of sensitive query/body content by only
// logging method/url/status/response-time (never full req/res bodies).
morgan.token('user', (req) => (req.user ? String(req.user.id) : '-'));
app.use(morgan(':method :url :status :response-time ms - user::user', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate limiting is a production/dev concern only — the automated test suite
// makes many rapid, legitimate login/API calls against the same in-process
// server and should never be throttled by it.
const skipInTest = () => process.env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/resend-otp', authLimiter);

// Tighter limiter on OTP verification specifically, since a 6-digit code is
// brute-forceable much faster than a password — this caps guesses per IP
// independently of the per-session attempts cap enforced in otpService.
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});
app.use('/api/auth/verify-otp', otpVerifyLimiter);

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK', data: { status: 'up', time: new Date().toISOString() } });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
