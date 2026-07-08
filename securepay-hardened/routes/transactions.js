const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { transfer, getTransactions } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimiter');

const transferValidation = [
  body('receiverEmail').isEmail().normalizeEmail().withMessage('Valid receiver email required'),
  body('amount')
    .isFloat({ min: 0.01, max: 50000 })
    .withMessage('Amount must be between $0.01 and $50,000')
];

router.post('/transfer', protect, transferLimiter, transferValidation, transfer);
router.get('/transactions', protect, getTransactions);

module.exports = router;
