const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'failed_login',
        'successful_login',
        'logout',
        'register',
        'transfer',
        'unauthorized_access',
        'suspicious_activity',
        'brute_force',
        'weak_password',
        'account_locked',
        'rate_limit_exceeded'
      ],
      required: true
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, default: null },
    ipAddress: { type: String },
    userAgent: { type: String },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    resolved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
