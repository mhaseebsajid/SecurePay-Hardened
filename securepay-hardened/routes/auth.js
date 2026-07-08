const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Validation rules
const registerValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required').isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);

// Private routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
