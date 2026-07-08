const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SecurityEvent = require('../models/SecurityEvent');
const { logger } = require('../utils/logger');

// ──────────────────────────────────────────────
// @route   GET /api/security-status
// @access  Private
// ──────────────────────────────────────────────
exports.getSecurityStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Count failed logins for this user
    const failedLogins = await SecurityEvent.countDocuments({
      type: 'failed_login',
      $or: [{ userId: req.user._id }, { email: req.user.email }],
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24h
    });

    // Get recent alerts (last 24 hours)
    const alerts = await SecurityEvent.find({
      $or: [{ userId: req.user._id }, { email: req.user.email }],
      severity: { $in: ['high', 'critical'] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type description severity createdAt');

    // Threat detection score based on security events
    let threatScore = 98;
    if (failedLogins > 0) threatScore -= failedLogins * 5;
    if (alerts.length > 0) threatScore -= alerts.length * 8;
    threatScore = Math.max(10, Math.min(100, threatScore));

    res.status(200).json({
      success: true,
      encryption: 'Active',
      firewall: 'Protected',
      failed_logins: failedLogins,
      security_score: user.securityScore,
      threat_detection_score: threatScore,
      alerts: alerts.map((a) => ({
        type: a.type,
        description: a.description,
        severity: a.severity,
        timestamp: a.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// @route   GET /api/admin/users
// @access  Admin
// ──────────────────────────────────────────────
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// @route   GET /api/admin/logs
// @access  Admin
// ──────────────────────────────────────────────
exports.getSecurityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.severity) filter.severity = req.query.severity;

    const [events, total] = await Promise.all([
      SecurityEvent.find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SecurityEvent.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      events
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// @route   GET /api/admin/all-transactions
// @access  Admin
// ──────────────────────────────────────────────
exports.getAllTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find()
      .populate('sender', 'fullName email walletId')
      .populate('receiver', 'fullName email walletId')
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    next(error);
  }
};
