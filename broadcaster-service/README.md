# Broadcaster Service

Backend service for managing broadcaster followers and signal broadcasting using MongoDB.

## Features

- ✅ **MongoDB Storage** - Persistent follower data
- ✅ **Event Syncing** - Automatically syncs FollowerAdded/FollowerRemoved events from blockchain
- ✅ **Real-time Listening** - Listens for new events in real-time
- ✅ **Auto-recovery** - Rebuilds state from blockchain on startup
- ✅ **Signal Broadcasting** - Broadcasts signals to all followers via Telegram
- ✅ **REST API** - Easy integration with broadcaster and user bots

## Setup

### 1. Install MongoDB

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Install Dependencies

```bash
cd broadcaster-service
npm install
```

### 3. Configure Environment

Add to your `.env` file (in the root directory):

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/signalfi

# Broadcaster Service
BROADCASTER_SERVICE_PORT=3001

# RPC (if different from default)
RPC_URL=https://achievement-acts-content-guys.trycloudflare.com
```

### 4. Start the Service

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Get Followers
```bash
GET /followers/:broadcasterAddress
```

**Response:**
```json
{
  "broadcaster": "0xabc...",
  "followers": ["0x123...", "0x456..."],
  "count": 2,
  "details": [...]
}
```

### Get Follower Count
```bash
GET /followers/:broadcasterAddress/count
```

### Get Following (for a user)
```bash
GET /following/:userAddress
```

### Register User Chat
```bash
POST /register-user
Content-Type: application/json

{
  "userAddress": "0x123...",
  "chatId": "123456789"
}
```

### Broadcast Signal
```bash
POST /broadcast
Content-Type: application/json

{
  "broadcasterAddress": "0xabc...",
  "signalType": "BUY",
  "tokenIn": "PYUSD",
  "tokenOut": "WETH",
  "amount": "100"
}
```

### Get Signal History
```bash
GET /signals/:broadcasterAddress?limit=10&skip=0
```

### Manual Sync
```bash
POST /sync
```

### Sync Status
```bash
GET /sync/status
```

## How It Works

### 1. Initial Sync
On startup, the service:
- Queries all `FollowerAdded` events from the blockchain
- Queries all `FollowerRemoved` events from the blockchain
- Stores the current state in MongoDB

### 2. Real-time Listening
After initial sync, it:
- Listens for new `FollowerAdded` events
- Listens for new `FollowerRemoved` events
- Updates MongoDB in real-time

### 3. Incremental Sync
Every 5 minutes, it:
- Syncs any missed events
- Updates the last synced block number

### 4. Broadcasting
When a signal is broadcast:
- Fetches all followers from MongoDB
- Gets their Telegram chat IDs
- Sends notifications via Telegram API
- Saves signal history

## Database Schema

### Followers Collection
```javascript
{
  broadcasterAddress: String (indexed),
  followerAddress: String (indexed),
  followedAt: Date,
  blockNumber: Number,
  transactionHash: String
}
```

### UserChats Collection
```javascript
{
  userAddress: String (unique, indexed),
  chatId: String,
  registeredAt: Date,
  lastActive: Date
}
```

### Signals Collection
```javascript
{
  broadcasterAddress: String (indexed),
  signalType: String (BUY/SELL),
  tokenIn: String,
  tokenOut: String,
  amount: String,
  timestamp: Date,
  followerCount: Number,
  executedCount: Number
}
```

### SyncState Collection
```javascript
{
  eventType: String (FollowerAdded/FollowerRemoved),
  lastSyncedBlock: Number,
  lastSyncedAt: Date
}
```

## Integration

### Broadcaster Bot
```javascript
const axios = require('axios');

// Get follower count
const response = await axios.get('http://localhost:3001/followers/0xabc.../count');
console.log(`You have ${response.data.count} followers`);

// Broadcast signal
await axios.post('http://localhost:3001/broadcast', {
  broadcasterAddress: session.wallet.address,
  signalType: 'BUY',
  tokenIn: 'PYUSD',
  tokenOut: 'WETH',
  amount: '100'
});
```

### User Bot
```javascript
// Register user when they connect wallet
await axios.post('http://localhost:3001/register-user', {
  userAddress: session.wallet.address,
  chatId: msg.chat.id
});
```

## Monitoring

Check service health:
```bash
curl http://localhost:3001/health
```

Check sync status:
```bash
curl http://localhost:3001/sync/status
```

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Check logs
sudo journalctl -u mongodb
```

### Event Sync Issues
- Check RPC connection
- Verify contract address in deployment-info.json
- Trigger manual sync: `POST /sync`

### Missing Notifications
- Verify user registered with `/register-user`
- Check user_bot_token in .env
- Check Telegram bot permissions
