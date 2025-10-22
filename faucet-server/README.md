# 🚰 Simple ARC Faucet Server

## ✅ No Smart Contract Needed!

Instead of a contract, this uses **Account #10** from network.json to directly send ARC to users.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd faucet-server
npm install
```

### 2. Start Server

```bash
npm start
```

Output:
```
🚰 ARC Faucet Server Starting...
Faucet Address: 0x...
Faucet Balance: 160000 ARC
Can serve 16000 users

✅ Faucet server running on http://localhost:3001
```

### 3. Start React App (separate terminal)

```bash
cd ../faucet-app
npm start
```

---

## 🎯 How It Works

1. **User clicks "Get 10 ARC"** in React app
2. React app **calls POST /claim** with user's address
3. Server **sends 10 ARC** from pre-funded account
4. User receives ARC instantly!

---

## 📡 API Endpoints

### POST /claim
Request 10 ARC

```bash
curl -X POST http://localhost:3001/claim \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYourAddress"}'
```

Response:
```json
{
  "success": true,
  "txHash": "0x123...",
  "amount": "10",
  "message": "Successfully sent 10 ARC!"
}
```

### GET /balance
Check faucet balance

```bash
curl http://localhost:3001/balance
```

### GET /health
Health check

```bash
curl http://localhost:3001/health
```

---

## ⚙️ Configuration

Edit `server.js`:

```javascript
const CLAIM_AMOUNT = ethers.utils.parseEther('10'); // Change amount
const COOLDOWN_TIME = 86400; // 24 hours in seconds (0 = no cooldown)
```

---

## 🔑 Security

- Uses Account #10 from network.json (pre-funded)
- Cooldown prevents spam (configurable)
- CORS enabled for local development
- Validates addresses before sending

---

## 💰 Faucet Balance

The faucet uses this account:
- **Private Key**: `134aea...` (Account #10)
- **Initial Balance**: ~160,000 ARC
- **Can serve**: 16,000 users (10 ARC each)

To refund, just send ARC to the faucet address!

---

## 🐛 Troubleshooting

### "Faucet is empty"
- Check balance: `curl http://localhost:3001/balance`
- Send more ARC to faucet address

### "CORS error"
- Make sure server is running on port 3001
- Check FAUCET_SERVER_URL in faucet-app/src/config.js

### "Connection refused"
- Start faucet server first: `npm start`
- Then start React app

---

## ✅ Benefits Over Smart Contract

| Smart Contract | This Solution |
|---|---|
| ❌ Requires contract deployment | ✅ Just run server |
| ❌ Funding contract fails on Arcology | ✅ Uses regular account |
| ❌ Gas costs for contract calls | ✅ Simple transfers |
| ❌ Complex debugging | ✅ Easy to debug |

---

**Perfect for testing! No blockchain complications!** 🎉
