const { validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SecurityEvent = require('../models/SecurityEvent');
const { securityLogger, logger } = require('../utils/logger');

// ──────────────────────────────────────────────
// @route   POST /api/transfer
// @access  Private
// ──────────────────────────────────────────────
exports.transfer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { receiverEmail, amount, description } = req.body;
    const parsedAmount = parseFloat(amount);

    // Cannot send to yourself
    if (receiverEmail.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'You cannot transfer funds to yourself.' });
    }

    // Find receiver
    const receiver = await User.findOne({ email: receiverEmail.toLowerCase() });
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver account not found.' });
    }

    // Check sender balance
    const sender = await User.findById(req.user._id);
    if (sender.balance < parsedAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Your current balance is $${sender.balance.toFixed(2)}.`
      });
    }

    // Rapid transfer detection – flag if same receiver within 60 seconds
    const recentTx = await Transaction.findOne({
      sender: sender._id,
      receiver: receiver._id,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    });

    let status = 'completed';
    let flagReason = null;
    if (recentTx) {
      status = 'flagged';
      flagReason = 'Rapid repeated transfer to same receiver detected';
      await SecurityEvent.create({
        type: 'suspicious_activity',
        userId: sender._id,
        email: sender.email,
        ipAddress: req.ip,
        description: flagReason,
        severity: 'high'
      });
      securityLogger.warn(`Suspicious activity: rapid transfers by ${sender.email}`);
    }

    // Deduct from sender, credit receiver (only if not flagged)
    if (status === 'completed') {
      await User.findByIdAndUpdate(sender._id, { $inc: { balance: -parsedAmount } });
      await User.findByIdAndUpdate(receiver._id, { $inc: { balance: parsedAmount } });
    } else {
      // Deduct but hold – for demo purposes we still deduct to show realistic behavior
      await User.findByIdAndUpdate(sender._id, { $inc: { balance: -parsedAmount } });
    }

    const transaction = await Transaction.create({
      sender: sender._id,
      receiver: receiver._id,
      senderWalletId: sender.walletId,
      receiverWalletId: receiver.walletId,
      receiverEmail: receiver.email,
      amount: parsedAmount,
      type: 'transfer',
      status,
      description: description || 'Transfer',
      completedAt: status === 'completed' ? new Date() : null,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        flagReason
      }
    });

    await SecurityEvent.create({
      type: 'transfer',
      userId: sender._id,
      email: sender.email,
      ipAddress: req.ip,
      description: `Transfer of $${parsedAmount} from ${sender.email} to ${receiver.email}. Status: ${status}`,
      severity: status === 'flagged' ? 'high' : 'low'
    });

    const updatedSender = await User.findById(sender._id);
    logger.info(`Transfer: ${sender.email} → ${receiver.email} $${parsedAmount} [${status}]`);

    res.status(201).json({
      success: true,
      message: status === 'completed'
        ? `$${parsedAmount.toFixed(2)} transferred to ${receiver.fullName} successfully.`
        : `Transfer flagged for review. $${parsedAmount.toFixed(2)} is on hold.`,
      transaction: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        status: transaction.status,
        receiver: receiver.fullName,
        receiverEmail: receiver.email
      },
      newBalance: updatedSender.balance
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// @route   GET /api/transactions
// @access  Private
// ──────────────────────────────────────────────
exports.getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('sender', 'fullName email walletId')
        .populate('receiver', 'fullName email walletId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      transactions
    });
  } catch (error) {
    next(error);
  }
};
