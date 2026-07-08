require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SecurityEvent = require('../models/SecurityEvent');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/securepay';

const generateWalletId = () => 'SP-' + uuidv4().split('-')[0].toUpperCase();

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await SecurityEvent.deleteMany({});
    console.log('🗑️  Cleared existing data');

    const hashedPassword = await bcrypt.hash('SecurePay@2024', 12);
    const adminHash = await bcrypt.hash('Admin@SecurePay1', 12);

    // Create demo users
    const users = await User.insertMany([
      {
        fullName: 'Admin User',
        email: 'admin@securepay.com',
        phone: '+1-555-000-0001',
        password: adminHash,
        walletId: generateWalletId(),
        role: 'admin',
        balance: 50000,
        securityScore: 98,
        lastLogin: new Date()
      },
      {
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '+1-555-100-2001',
        password: hashedPassword,
        walletId: generateWalletId(),
        balance: 12450.75,
        securityScore: 88,
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        fullName: 'Bob Martinez',
        email: 'bob@example.com',
        phone: '+1-555-100-3002',
        password: hashedPassword,
        walletId: generateWalletId(),
        balance: 3800.00,
        securityScore: 72,
        lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        fullName: 'Carol White',
        email: 'carol@example.com',
        phone: '+1-555-100-4003',
        password: hashedPassword,
        walletId: generateWalletId(),
        balance: 27900.50,
        securityScore: 95,
        lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        fullName: 'David Kim',
        email: 'david@example.com',
        phone: '+1-555-100-5004',
        password: hashedPassword,
        walletId: generateWalletId(),
        balance: 5200.00,
        securityScore: 60,
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ]);
    console.log(`👤 Created ${users.length} users`);

    const [admin, alice, bob, carol, david] = users;

    // Create sample transactions
    const now = Date.now();
    const transactions = await Transaction.insertMany([
      {
        transactionId: 'TX-' + uuidv4().split('-')[0].toUpperCase(),
        sender: alice._id,
        receiver: bob._id,
        senderWalletId: alice.walletId,
        receiverWalletId: bob.walletId,
        receiverEmail: bob.email,
        amount: 1240.00,
        type: 'transfer',
        status: 'completed',
        description: 'AWS Payment',
        completedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000)
      },
      {
        transactionId: 'TX-' + uuidv4().split('-')[0].toUpperCase(),
        sender: bob._id,
        receiver: carol._id,
        senderWalletId: bob.walletId,
        receiverWalletId: carol.walletId,
        receiverEmail: carol.email,
        amount: 450.00,
        type: 'transfer',
        status: 'completed',
        description: 'Server fees',
        completedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
      },
      {
        transactionId: 'TX-' + uuidv4().split('-')[0].toUpperCase(),
        sender: carol._id,
        receiver: alice._id,
        senderWalletId: carol.walletId,
        receiverWalletId: alice.walletId,
        receiverEmail: alice.email,
        amount: 2000.00,
        type: 'transfer',
        status: 'pending',
        description: 'Freelance payment',
        createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000)
      },
      {
        transactionId: 'TX-' + uuidv4().split('-')[0].toUpperCase(),
        sender: david._id,
        receiver: alice._id,
        senderWalletId: david.walletId,
        receiverWalletId: alice.walletId,
        receiverEmail: alice.email,
        amount: 8500.00,
        type: 'transfer',
        status: 'completed',
        description: 'GlobalX wire',
        completedAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000)
      },
      {
        transactionId: 'TX-' + uuidv4().split('-')[0].toUpperCase(),
        sender: alice._id,
        receiver: bob._id,
        senderWalletId: alice.walletId,
        receiverWalletId: bob.walletId,
        receiverEmail: bob.email,
        amount: 12.50,
        type: 'transfer',
        status: 'failed',
        description: 'Coffee House',
        createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000)
      },
      {
        transactionId: 'TX-' + uuidv4().split('-')[0].toUpperCase(),
        sender: carol._id,
        receiver: david._id,
        senderWalletId: carol.walletId,
        receiverWalletId: david.walletId,
        receiverEmail: david.email,
        amount: 19.99,
        type: 'transfer',
        status: 'completed',
        description: 'Subscription',
        completedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000)
      }
    ]);
    console.log(`💳 Created ${transactions.length} transactions`);

    // Create sample security events
    await SecurityEvent.insertMany([
      {
        type: 'failed_login',
        email: 'attacker@evil.com',
        ipAddress: '45.22.102.11',
        description: 'Failed login – unknown account',
        severity: 'medium',
        createdAt: new Date(now - 2 * 60 * 60 * 1000)
      },
      {
        type: 'brute_force',
        email: 'attacker@evil.com',
        ipAddress: '45.22.102.11',
        description: 'Brute force detected – 5 failed attempts',
        severity: 'critical',
        createdAt: new Date(now - 1 * 60 * 60 * 1000)
      },
      {
        type: 'successful_login',
        userId: alice._id,
        email: alice.email,
        ipAddress: '192.168.1.104',
        description: `Successful login: ${alice.email}`,
        severity: 'low',
        createdAt: new Date(now - 30 * 60 * 1000)
      },
      {
        type: 'transfer',
        userId: alice._id,
        email: alice.email,
        ipAddress: '192.168.1.104',
        description: 'Transfer of $1,240.00 completed',
        severity: 'low',
        createdAt: new Date(now - 25 * 60 * 1000)
      }
    ]);
    console.log('🔒 Created security events');

    console.log('\n✅ Seed completed successfully!\n');
    console.log('──────────────────────────────────────────');
    console.log('Demo Accounts:');
    console.log('  Admin:  admin@securepay.com / Admin@SecurePay1');
    console.log('  User:   alice@example.com   / SecurePay@2024');
    console.log('  User:   bob@example.com     / SecurePay@2024');
    console.log('  User:   carol@example.com   / SecurePay@2024');
    console.log('  User:   david@example.com   / SecurePay@2024');
    console.log('──────────────────────────────────────────\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
