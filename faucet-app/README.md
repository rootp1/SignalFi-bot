# SignalFi PYUSD Faucet App

## 🚀 React App for PayPal USD Testing

This is a React app that allows users to:
1. Add Arcology Devnet to MetaMask (one click)
2. Claim free PYUSD tokens from the faucet contract (100 PYUSD every 24 hours)
3. Mint free WETH tokens for testing
4. View their token balances

**Features PYUSD Faucet Integration with 24-hour cooldown!**

---

## 📦 Setup Instructions

### Step 1: Install Dependencies

```bash
cd faucet-app
npm install
```

### Step 2: Update Contract Addresses

After deploying your contracts, update `src/config.js`:

```javascript
export const PYUSD_ADDRESS = '0xYourPYUSDAddress';
export const WETH_ADDRESS = '0xYourWETHAddress';
export const AMM_ADDRESS = '0xYourAMMAddress';
export const PYUSD_FAUCET_ADDRESS = '0xYourPYUSDFaucetAddress';
export const SETTLEMENT_ADDRESS = '0xYourSettlementAddress';
```

**Current addresses (from your deployment):**
- PYUSD: `0xA937A31D284b461424CC8f8D9c333a52544731fE`
- WETH: `0xd463462DF8E5b7E986FAaa452E0Af7330B6541a7`
- AMM: `0x48b77bd6D1a3BE0A3257c87352694b92a0E1aa96`
- PYUSD Faucet: `0xF1CB91dE4A88856C7c451048eb28D25E5f3Bfe89`

### Step 3: Run the App

```bash
npm start
```

App will open at `http://localhost:3000`

---

## 🎮 How to Use

### For Users Testing the App:

1. **Open the app** in browser (http://localhost:3000)

2. **Click "Connect MetaMask"**
   - Connects your wallet

3. **Click "Add Arcology Network"**
   - Adds network to MetaMask (one click!)
   - Chain ID: 118
   - RPC: https://achievement-acts-content-guys.trycloudflare.com

4. **Click "Switch to Arcology"**
   - Switches to the correct network

5. **Click "Get 100 PYUSD"**
   - Claims 100 PYUSD from the faucet contract
   - Can claim once every 24 hours
   - Uses the PyUSDFaucet.sol contract

6. **Click "Get 1 WETH"**
   - Mints 1 WETH to your wallet

7. **Done!** You now have test tokens

---

## 💰 Gas Costs

The claim/mint functions are extremely cheap:
- **PYUSD claim from faucet**: ~100,000 gas (basically free)
- **WETH mint**: ~50,000 gas (basically free)

With Arcology's low gas prices, claiming 100 PYUSD costs almost nothing!

---

## 🔧 Features

✅ **One-Click Network Addition**
- Automatically adds Arcology Devnet to MetaMask
- Includes all network details (RPC, Chain ID, etc.)

✅ **PYUSD Faucet Integration**
- Uses PyUSDFaucet.sol smart contract
- 24-hour cooldown between claims
- 100 PYUSD per claim
- Displays cooldown timer

✅ **Unlimited WETH Minting**
- No rate limits for testing
- Perfect for development

✅ **Real-Time Balance Display**
- Shows PYUSD and WETH balances
- Automatically updates after claiming/minting
- Displays PYUSD faucet cooldown status

✅ **Network Detection**
- Detects if user is on correct network
- Shows warning if on wrong network
- One-click switch to Arcology

---

## 📁 Project Structure

```
faucet-app/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.js             # Main React component
│   ├── config.js          # Contract addresses & network config
│   └── index.js           # Entry point
├── package.json           # Dependencies
└── README.md             # This file
```

---

## 🔍 How It Works

### Adding Network to MetaMask

```javascript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x76',  // 118 in hex
    chainName: 'Arcology Devnet',
    rpcUrls: ['https://achievement-acts-content-guys.trycloudflare.com']
  }]
});
```

### Claiming PYUSD from Faucet

```javascript
const faucetContract = new ethers.Contract(PYUSD_FAUCET_ADDRESS, PYUSD_FAUCET_ABI, signer);
await faucetContract.claimPYUSD();
```

The PyUSDFaucet contract enforces:
- 100 PYUSD per claim
- 24-hour cooldown between claims
- Prevents double claiming

---

## 🎯 Next Steps

1. **Test the faucet** - Make sure claiming PYUSD works
2. **Share with testers** - Give them the URL
3. **Build trading UI** - Create order book, trading interface with PYUSD

---

## ⚠️ Important Notes

### For Testing Only!

- **Faucet contract** = 24-hour cooldown per address
- **Rate limiting built-in** = prevents spam
- **Production-ready** = uses proper faucet pattern

### Features:

- PayPal USD (PYUSD) mock token with 6 decimals
- Faucet contract with cooldown mechanism
- Perfect for testnet and development

---

## 🐛 Troubleshooting

### "Please install MetaMask"
- Install MetaMask browser extension
- Refresh the page

### "Error adding network"
- MetaMask might already have the network
- Try "Switch to Arcology" instead

### "Transaction failed"
- Make sure you're on Arcology Devnet
- Check you have some native tokens for gas
- Try increasing gas limit

### Balances not updating
- Click "Refresh Balances" button
- Wait a few seconds for blockchain confirmation

---

## 📞 Support

If you encounter issues:
1. Check MetaMask is installed
2. Verify you're on Arcology Devnet (Chain ID: 118)
3. Check contract addresses in `config.js` match deployment
4. Open browser console (F12) for error messages

---

**Status**: ✅ Ready to use for testing!
