const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SecurityEvent = require('../models/SecurityEvent');
const { securityLogger, logger } = require('../utils/logger');

// ──────────────────────────────────────────────
// @route   GET /api/wallet
// @access  Private
// ──────────────────────────────────────────────
exports.getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Calculate monthly spending
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySpending = await Transaction.aggregate([
      {
        $match: {
          sender: req.user._id,
          status: 'completed',
          type: 'transfer',
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyDeposits = await Transaction.aggregate([
      {
        $match: {
          receiver: req.user._id,
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      wallet: {
        walletId: user.walletId,
        balance: user.balance,
        securityScore: user.securityScore,
        monthlySpending: monthlySpending[0]?.total || 0,
        recentDeposits: monthlyDeposits[0]?.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// @route   POST /api/wallet/deposit
// @access  Private
// Simulation only – adds funds to the wallet
// ──────────────────────────────────────────────
exports.deposit = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount.' });
    }

    if (parsedAmount > 100000) {
      return res.status(400).json({ success: false, message: 'Maximum single deposit is $100,000.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { balance: parsedAmount } },
      { new: true }
    );

    // Create a self-referential deposit transaction for the ledger
    const tx = await Transaction.create({
      sender: req.user._id,
      receiver: req.user._id,
      senderWalletId: user.walletId,
      receiverWalletId: user.walletId,
      amount: parsedAmount,
      type: 'deposit',
      status: 'completed',
      description: 'Simulated deposit',
      completedAt: new Date(),
      metadata: { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
    });

    logger.info(`Deposit: User ${req.user.email} deposited $${parsedAmount}`);
    res.status(200).json({
      success: true,
      message: `$${parsedAmount.toFixed(2)} deposited successfully.`,
      newBalance: user.balance,
      transaction: { transactionId: tx.transactionId, amount: tx.amount, status: tx.status }
    });
  } catch (error) {
    next(error);
  }
};
