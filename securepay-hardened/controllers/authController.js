const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const SecurityEvent = require('../models/SecurityEvent');
const { securityLogger, logger } = require('../utils/logger');

// List of commonly used weak passwords for demonstration
const WEAK_PASSWORDS = [
  'password', '123456', 'admin123', 'password123', '123456789',
  'qwerty', 'abc123', 'letmein', 'welcome', '111111', 'iloveyou'
];

// Helper: generate JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Helper: send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        walletId: user.walletId,
        role: user.role,
        balance: user.balance,
        securityScore: user.securityScore,
        lastLogin: user.lastLogin
      }
    });
};

// ──────────────────────────────────────────────
// @route   POST /api/register
// @access  Public
// ──────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, email, phone, password } = req.body;

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    // Detect weak passwords (cybersecurity demo feature)
    const isWeak = WEAK_PASSWORDS.includes(password.toLowerCase());
    let securityScore = 75;
    let alert = null;
    if (isWeak) {
      securityScore = 30;
      alert = 'Your password is commonly used and weak. Please choose a stronger password for your security.';
      await SecurityEvent.create({
        type: 'weak_password',
        email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        description: `User registered with a weak/common password: ${email}`,
        severity: 'medium'
      });
      securityLogger.warn(`Weak password used during registration by ${email}`);
    }

    const user = await User.create({ fullName, email, phone, password, securityScore });

    await SecurityEvent.create({
      type: 'register',
      userId: user._id,
      email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      description: `New user registered: ${email}`,
      severity: 'low'
    });

    logger.info(`New user registered: ${email}`);

    const response = sendTokenResponse(user, 201, res);
    if (alert) {
      // We override to inject the alert
      const token = signToken(user._id);
      return res.status(201).json({
        success: true,
        token,
        alert,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          walletId: user.walletId,
          role: user.role,
          balance: user.balance,
          securityScore: user.securityScore
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// @route   POST /api/login
// @access  Public
// ──────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user WITH password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      // Log failed attempt (unknown email)
      await SecurityEvent.create({
        type: 'failed_login',
        email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        description: `Failed login attempt for unknown email: ${email}`,
        severity: 'medium'
      });
      securityLogger.warn(`Failed login - unknown email: ${email} from ${req.ip}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check if account is locked
    if (user.isLocked) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      securityLogger.warn(`Locked account login attempt: ${email}`);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to too many failed attempts. Try again in ${remaining} minutes.`
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      const attemptsLeft = Math.max(0, 5 - (user.loginAttempts + 1));

      await SecurityEvent.create({
        type: 'failed_login',
        userId: user._id,
        email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        description: `Failed login attempt for ${email}. Attempts: ${user.loginAttempts + 1}`,
        severity: user.loginAttempts + 1 >= 4 ? 'high' : 'medium'
      });
      securityLogger.warn(`Failed password for ${email} from ${req.ip} (attempt #${user.loginAttempts + 1})`);

      if (attemptsLeft === 0) {
        await SecurityEvent.create({
          type: 'account_locked',
          userId: user._id,
          email,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          description: `Account locked after 5 failed login attempts: ${email}`,
          severity: 'critical'
        });
      }

      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${attemptsLeft > 0 ? `${attemptsLeft} attempt(s) remaining.` : 'Account locked for 15 minutes.'}`
      });
    }

    // Successful login
    await user.resetLoginAttempts();
    await SecurityEvent.create({
      type: 'successful_login',
      userId: user._id,
      email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      description: `Successful login: ${email}`,
      severity: 'low'
    });
    securityLogger.info(`Successful login: ${email} from ${req.ip}`);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// @route   POST /api/logout
// @access  Private
// ──────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    await SecurityEvent.create({
      type: 'logout',
      userId: req.user._id,
      email: req.user.email,
      ipAddress: req.ip,
      description: `User logged out: ${req.user.email}`,
      severity: 'low'
    });

    res
      .cookie('token', '', { expires: new Date(0), httpOnly: true })
      .status(200)
      .json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// @route   GET /api/me
// @access  Private
// ──────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
