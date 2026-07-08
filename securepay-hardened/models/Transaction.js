const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      default: () => 'TX-' + uuidv4().split('-')[0].toUpperCase()
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderWalletId: { type: String, required: true },
    receiverWalletId: { type: String, required: true },
    receiverEmail: { type: String },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be at least 0.01']
    },
    type: {
      type: String,
      enum: ['transfer', 'deposit', 'withdrawal'],
      default: 'transfer'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'flagged'],
      default: 'pending'
    },
    description: { type: String, trim: true, default: 'Transfer' },
    metadata: {
      ipAddress: String,
      userAgent: String,
      flagReason: String
    },
    completedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ receiver: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
