const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getSecurityStatus,
  getAllUsers,
  getSecurityLogs,
  getAllTransactions
} = require('../controllers/securityController');

// Private – any authenticated user
router.get('/security-status', protect, getSecurityStatus);

// Admin only routes
router.get('/admin/users', protect, adminOnly, getAllUsers);
router.get('/admin/logs', protect, adminOnly, getSecurityLogs);
router.get('/admin/all-transactions', protect, adminOnly, getAllTransactions);

module.exports = router;
