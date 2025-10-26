# PyUSD Broadcaster Bot 🎙️

Telegram bot for broadcasters to post trade signals to their followers on the PyUSDCopyBot platform.

## Features

- 🔐 Secure wallet connection
- 📝 On-chain broadcaster registration
- 📡 Signal broadcasting (BUY/SELL)
- 📊 Performance statistics tracking
- 👥 Follower management
- 💰 Fee configuration (10-20%)
- 📜 Signal history

## Commands

### Setup
- `/start` - Start the bot and see welcome message
- `/help` - Show all available commands
- `/connect` - Connect your Ethereum wallet
- `/myaddress` - Display your connected wallet address

### Broadcaster Management
- `/register` - Register as a broadcaster
  - Format: `Name | Fee`
  - Example: `Crypto Expert | 15`
- `/stats` - View your broadcaster statistics
- `/followers` - Check your follower count
- `/fee` - Update your fee percentage (10-20%)

### Signal Broadcasting
- `/broadcast` - Post a new trade signal
  - Choose BUY or SELL
  - Enter amount
  - Confirm signal

### Information
- `/history` - View your past signals
- `/contracts` - Show deployed contract addresses

### Utility
- `/cancel` - Cancel current operation

## Installation

```bash
cd broadcaster-bot
npm install
```

## Configuration

The bot uses the `.env` file in the root directory:

```env
broadcaster_bot_token=YOUR_BOT_TOKEN_HERE
```

Contract addresses are loaded from `../hardhat/deployment-info.json`

## Running

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage Flow

1. **Start Bot**: `/start`
2. **Connect Wallet**: `/connect` and provide private key
3. **Register**: `/register` with your name and fee
4. **Post Signals**: `/broadcast` to send trade signals
5. **Track Performance**: `/stats` to see your metrics

## Signal Format

When broadcasting:

**BUY Signal**: 
- Amount in PYUSD to spend buying WETH
- Example: `100` (buy WETH with 100 PYUSD)

**SELL Signal**:
- Amount in WETH to sell for PYUSD  
- Example: `0.5` (sell 0.5 WETH for PYUSD)

## Requirements

- Node.js 14+
- Telegram account
- Arcology DevNet wallet with ARC for gas
- Broadcaster bot token from @BotFather

## Security

⚠️ **For Testnet Use Only**
- Never use this bot with real funds
- Private keys are stored in memory only
- Use dedicated test wallets

## Troubleshooting

**Bot not responding:**
- Check if bot is running
- Verify token in .env
- Check console for errors

**Transaction failed:**
- Ensure wallet has ARC for gas
- Verify RPC connection
- Check contract addresses

**Registration failed:**
- Fee must be between 10-20
- Wallet must not be registered already
- Check ARC balance for gas

## Support

For issues or questions, check the main repository documentation or create an issue.

## Tech Stack

- node-telegram-bot-api
- ethers.js v5
- Arcology Network
- Solidity smart contracts

---

**Status:** ✅ Running  
**Network:** Arcology DevNet  
**Chain ID:** 118
