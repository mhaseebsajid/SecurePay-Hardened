# SecurePay – Secure Digital Wallet System

> **Network Security & Information Assurance Course Project**  
> A full-stack digital wallet platform demonstrating secure fintech architecture, cybersecurity controls, and attack-defense mechanisms.

---

## 📁 Project Structure

```
/securepay
  /config
    db.js                  ← MongoDB connection
  /controllers
    authController.js      ← Register, Login, Logout, GetMe
    walletController.js    ← Get wallet, Deposit (simulation)
    transactionController.js ← Transfer, Get transactions
    securityController.js  ← Security status, Admin logs
  /middleware
    auth.js                ← JWT protect + adminOnly guards
    rateLimiter.js         ← General, Auth, Transfer limiters
    errorHandler.js        ← Global error + 404 handlers
  /models
    User.js                ← User schema (bcrypt hashing, lock logic)
    Transaction.js         ← Transaction ledger schema
    SecurityEvent.js       ← Security event/audit log schema
  /routes
    auth.js                ← POST /api/register, /api/login, /api/logout, GET /api/me
    wallet.js              ← GET /api/wallet, POST /api/wallet/deposit
    transactions.js        ← POST /api/transfer, GET /api/transactions
    security.js            ← GET /api/security-status, Admin routes
  /utils
    logger.js              ← Winston (app.log, error.log, security.log)
    seed.js                ← Demo data seeder
  /logs                    ← Auto-created; app.log, error.log, security.log
  /frontend
    index.html             ← Landing / Home page
    login.html             ← Login + Register forms
    dashboard.html         ← User wallet dashboard
    security.html          ← Security center / monitoring
  server.js                ← Express app entry point
  .env                     ← Environment variables
  package.json
  README.md
```

---

## ⚙️ Prerequisites

| Tool | Version |
|------|---------|
| Node.js | v18+ |
| MongoDB | v6+ (local) or MongoDB Atlas |
| npm | v9+ |

---

## 🚀 Installation & Setup

### Step 1 – Clone / Extract the project

```bash
cd securepay
```

### Step 2 – Install dependencies

```bash
npm install
```

### Step 3 – Configure environment variables

Edit `.env` — the defaults work for local development:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/securepay
JWT_SECRET=securepay_super_secret_jwt_key_2024_change_in_production
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500
```

> **Important:** For production, change `JWT_SECRET` to a long random string and set `NODE_ENV=production`.

### Step 4 – Start MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu / Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Step 5 – Seed demo data (optional but recommended)

```bash
npm run seed
```

This creates 5 demo accounts + sample transactions + security events.

**Demo Credentials:**
| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@securepay.com | Admin@SecurePay1 |
| User  | alice@example.com | SecurePay@2024 |
| User  | bob@example.com | SecurePay@2024 |
| User  | carol@example.com | SecurePay@2024 |
| User  | david@example.com | SecurePay@2024 |

### Step 6 – Start the server

```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

Server starts at: **http://localhost:5000**

### Step 7 – Open the frontend

The backend serves the frontend automatically.  
Open: **http://localhost:5000**

Or open the HTML files directly in a browser (with Live Server / VS Code extension) — they connect to `http://localhost:5000/api` automatically.

---

## 🌐 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | Public | Register new user |
| POST | `/api/login` | Public | Login, returns JWT |
| POST | `/api/logout` | 🔒 JWT | Logout, clears cookie |
| GET | `/api/me` | 🔒 JWT | Get current user |

**Register Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-123-4567",
  "password": "MyStr0ng!Pass"
}
```

**Login Body:**
```json
{
  "email": "john@example.com",
  "password": "MyStr0ng!Pass"
}
```

**Login Response:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "walletId": "SP-A1B2C3D4",
    "role": "user",
    "balance": 0,
    "securityScore": 75
  }
}
```

### Wallet

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet` | 🔒 JWT | Get wallet info + balance |
| POST | `/api/wallet/deposit` | 🔒 JWT | Simulate adding funds |

**Deposit Body:**
```json
{ "amount": 500.00 }
```

### Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/transfer` | 🔒 JWT | Transfer funds to another user |
| GET | `/api/transactions` | 🔒 JWT | Get paginated transaction history |

**Transfer Body:**
```json
{
  "receiverEmail": "bob@example.com",
  "amount": 100.00,
  "description": "Payment for services"
}
```

**Transfer Response:**
```json
{
  "success": true,
  "message": "$100.00 transferred to Bob Martinez successfully.",
  "transaction": {
    "transactionId": "TX-A1B2C3D4",
    "amount": 100,
    "status": "completed",
    "receiver": "Bob Martinez"
  },
  "newBalance": 900.00
}
```

### Security

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/security-status` | 🔒 JWT | Security metrics for current user |
| GET | `/api/admin/users` | 🔒 Admin | All users |
| GET | `/api/admin/logs` | 🔒 Admin | All security events |
| GET | `/api/admin/all-transactions` | 🔒 Admin | All transactions |
| GET | `/api/health` | Public | Server health check |

**Security Status Response:**
```json
{
  "success": true,
  "encryption": "Active",
  "firewall": "Protected",
  "failed_logins": 2,
  "security_score": 85,
  "threat_detection_score": 75,
  "alerts": [
    {
      "type": "failed_login",
      "description": "Failed login attempt",
      "severity": "medium",
      "timestamp": "2024-05-24T12:00:00Z"
    }
  ]
}
```

---

## 🔒 Security Features Implemented

### 1. Password Security
- **bcrypt hashing** (12 rounds) — plaintext never stored
- **Weak password detection** — detects `password`, `123456`, `admin123`, etc.
- **Password length validation** — minimum 8 characters

### 2. Authentication & Sessions
- **JWT tokens** — signed with `HS256`, expiry configurable
- **Account lockout** — 5 failed attempts → 15-minute lock
- **Login attempt tracking** — stored in DB per user

### 3. Rate Limiting
- **General API** — 100 req/15 min per IP
- **Auth endpoints** — 5 failed req/15 min per IP
- **Transfer endpoint** — 10 req/minute per IP

### 4. Security Middleware
- **Helmet** — HTTP security headers (XSS, HSTS, etc.)
- **CORS** — whitelist-based origin control
- **Input validation** — `express-validator` on all inputs

### 5. Fraud Detection
- **Rapid transfer detection** — flags same-receiver transfers within 60 seconds
- **Suspicious activity logging** — stored in `SecurityEvent` collection

### 6. Logging (Winston)
- `logs/app.log` — general application logs
- `logs/error.log` — error-level logs only
- `logs/security.log` — all security events (logins, transfers, alerts)
- Morgan HTTP request logging

### 7. Role-Based Access Control
- **User** — access own data only
- **Admin** — view all users, logs, transactions

---

## 🎓 Cybersecurity Demonstration Features

These features are included specifically for the **Network Security & Information Assurance** course:

| Feature | Endpoint / Location |
|---------|---------------------|
| Weak password detection | `POST /api/register` |
| Brute-force lockout simulation | `POST /api/login` (5+ failures) |
| Rapid transfer flagging | `POST /api/transfer` |
| Security event audit trail | `SecurityEvent` model + `/api/admin/logs` |
| Live threat monitoring dashboard | `security.html` + `/api/security-status` |
| Rate limiting attack defense | All API routes |

---

## 🖥️ Frontend Pages

| File | URL | Description |
|------|-----|-------------|
| `index.html` | `/` | Landing page, features, stats |
| `login.html` | `/login.html` | Login + Registration |
| `dashboard.html` | `/dashboard.html` | Wallet dashboard, transactions |
| `security.html` | `/security.html` | Security center, live metrics, logs |

All pages:
- Auto-detect login state and update the navbar
- Connect to the backend API on `localhost:5000`
- Fall back to demo/sample data when backend is offline
- Are fully responsive (mobile + desktop)

---

## 🔧 npm Commands

```bash
npm start          # Start server (production)
npm run dev        # Start with nodemon (auto-restart)
npm run seed       # Seed database with demo data
```

---

## 📝 Notes for Future Integration

- **Payment gateway** — Replace `wallet/deposit` simulation with Stripe/PayFast
- **2FA** — Add TOTP via `speakeasy` npm package
- **Email verification** — Add `nodemailer` for email confirmation on register
- **WebSockets** — Add `socket.io` for real-time transaction notifications
- **HTTPS** — Use `let's encrypt` / `nginx` in production
- **MongoDB Atlas** — Replace `MONGO_URI` in `.env` for cloud deployment
