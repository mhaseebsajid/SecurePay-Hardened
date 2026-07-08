const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getWallet, deposit } = require('../controllers/walletController');

router.get('/', protect, getWallet);
router.post('/deposit', protect, deposit);

module.exports = router;
