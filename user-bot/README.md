# PyUSD User Bot 👥

Telegram bot for users to deposit funds, follow broadcasters, and automatically copy trade on the PyUSDCopyBot platform.

## Features

- 🔐 Secure wallet connection
- 💵 PYUSD deposits and withdrawals
- 🚰 Test token faucet
- 👤 Follow/unfollow broadcasters
- 📊 Portfolio tracking
- 💹 Balance management
- 📜 Trade history
- 💰 P&L tracking

## Commands

### Setup
- `/start` - Start the bot and see welcome message
- `/help` - Show all available commands
- `/connect` - Connect your Ethereum wallet
- `/myaddress` - Display your connected wallet address

### Faucet & Balances
- `/claimfaucet` - Claim 100 test PYUSD (24h cooldown)
- `/balance` - View all your balances
  - Wallet PYUSD
  - Wallet WETH
  - Executor PYUSD
  - Executor WETH
  - Portfolio value

### Deposits & Withdrawals
- `/deposit <amount>` - Deposit PYUSD to executor
  - Example: `/deposit 100`
- `/withdraw <amount>` - Withdraw PYUSD from executor
  - Example: `/withdraw 50`

### Copy Trading
- `/broadcasters` - List available broadcasters
- `/subscribe <address>` - Follow a broadcaster
  - Example: `/subscribe 0xc8bc...`
- `/unsubscribe <address>` - Unfollow a broadcaster

### Portfolio
- `/portfolio` - View your current holdings
- `/history` - View your trade history
- `/pnl` - Check profit & loss

### Information
- `/contracts` - Show deployed contract addresses

### Utility
- `/cancel` - Cancel current operation

## Installation

```bash
cd user-bot
npm install
```

## Configuration

The bot uses the `.env` file in the root directory:

```env
user_bot_token=YOUR_BOT_TOKEN_HERE
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

### Getting Started

1. **Start Bot**: `/start`
2. **Connect Wallet**: `/connect` and provide private key
3. **Claim PYUSD**: `/claimfaucet` to get test tokens
4. **Deposit**: `/deposit 100` to deposit to executor
5. **Follow Broadcaster**: `/subscribe 0xc8bc...`

### Trading Flow

1. **Check Broadcasters**: `/broadcasters`
2. **Follow**: `/subscribe <address>`
3. **Monitor**: `/portfolio` and `/balance`
4. When broadcaster posts signal, trades execute automatically!
5. **Withdraw**: `/withdraw <amount>` anytime

## How Copy Trading Works

1. You deposit PYUSD to the executor contract
2. You follow broadcasters you trust
3. When a broadcaster posts a signal, the relayer executes it
4. All followers get the same fair price (via batch execution)
5. You pay the broadcaster's fee (10-20%) on profits
6. You can withdraw anytime

## Command Examples

```bash
# Get test PYUSD
/claimfaucet

# Check all balances
/balance

# Deposit 100 PYUSD
/deposit 100

# See available broadcasters
/broadcasters

# Follow a broadcaster
/subscribe 0xc8bc50cA2443F4cE0ebF1bC9396B7f53f62e9C13

# Check your portfolio
/portfolio

# Withdraw 50 PYUSD
/withdraw 50

# Unfollow broadcaster
/unsubscribe 0xc8bc50cA2443F4cE0ebF1bC9396B7f53f62e9C13
```

## Requirements

- Node.js 14+
- Telegram account
- Arcology DevNet wallet with ARC for gas
- User bot token from @BotFather

## Security

⚠️ **For Testnet Use Only**
- Never use this bot with real funds
- Private keys are stored in memory only
- Use dedicated test wallets
- Messages with private keys are deleted automatically

## Fees

- Broadcaster fees: 10-20% (configurable per broadcaster)
- AMM swap fee: 0.3%
- No platform fees (testnet)

## Benefits of Copy Trading

✅ **Fair Pricing**: All followers get same price via batch execution  
✅ **Automated**: No manual trading needed  
✅ **Transparent**: All transactions on-chain  
✅ **Flexible**: Withdraw anytime  
✅ **Low Cost**: Batch execution saves 95% on gas  

## Troubleshooting

**Bot not responding:**
- Check if bot is running
- Verify token in .env
- Check console for errors

**Transaction failed:**
- Ensure wallet has ARC for gas
- Check PYUSD balance
- Verify deposit/withdraw amounts

**Faucet claim failed:**
- Wait 24 hours between claims
- Check if faucet has funds

**Follow failed:**
- Verify broadcaster is registered
- Check address format
- Ensure ARC for gas

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
**Faucet:** 100 PYUSD per claim (24h cooldown)
