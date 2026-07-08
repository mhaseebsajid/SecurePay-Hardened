const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SecurityEvent = require('../models/SecurityEvent');
const { securityLogger } = require('../utils/logger');

const protect = async (req, res, next) => {
  let token;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Also check cookies for browser-based clients
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    await SecurityEvent.create({
      type: 'unauthorized_access',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      description: `Unauthorized access attempt to ${req.method} ${req.originalUrl}`,
      severity: 'medium'
    });
    securityLogger.warn(`Unauthorized access attempt: ${req.method} ${req.originalUrl} from ${req.ip}`);
    return res.status(401).json({ success: false, message: 'Not authorized. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    securityLogger.warn(`Invalid token used from IP ${req.ip}: ${error.message}`);
    return res.status(401).json({ success: false, message: 'Token is invalid or expired.' });
  }
};

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    securityLogger.warn(
      `Non-admin user ${req.user?.email} attempted to access admin route: ${req.originalUrl}`
    );
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

module.exports = { protect, adminOnly };
