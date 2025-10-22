# SignalFi UI - Arcology Devnet USDC Deposit

A React + Vite application for connecting to MetaMask and depositing USDC tokens to the Settlement Contract on Arcology Devnet.

## Features

- 🦊 **MetaMask Wallet Connection**: Connect your MetaMask wallet with one click
- 🔄 **Auto Network Switch**: Automatically prompts to switch/add Arcology Devnet to MetaMask
- 💰 **USDC Deposits**: Approve and deposit USDC tokens to the Settlement Contract
- 📊 **Real-time Balance Display**: Shows wallet balance, allowance, and deposited amounts
- ✅ **Transaction Tracking**: View transaction hashes and confirmation status

## Network Configuration

- **Network Name**: Arcology Devnet
- **Chain ID**: 118 (0x76)
- **RPC URL**: https://yttric-socorro-maniacally.ngrok-free.dev

## Contract Addresses

- **USDC Token**: `0xfbC451FBd7E17a1e7B18347337657c1F2c52B631`
- **WETH Token**: `0x2249977665260A63307Cf72a4D65385cC0817CB5`
- **AMM Contract**: `0x663536Ee9E60866DC936D2D65c535e795f4582D1`
- **Settlement Contract**: `0x010e5c3c0017b8009E926c39b072831065cc7Dc2`

## Prerequisites

- Node.js (v16 or higher)
- MetaMask browser extension
- Some ARC tokens for gas fees on Arcology Devnet
- USDC tokens on Arcology Devnet

## Installation

Install dependencies:
```bash
npm install
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

## How to Use

### 1. Connect Wallet
- Click the "🦊 Connect Wallet" button
- Approve the connection request in MetaMask
- The app will automatically prompt you to add/switch to Arcology Devnet if needed

### 2. Deposit USDC
1. Enter the amount of USDC you want to deposit
2. Click "Approve USDC" to allow the Settlement Contract to spend your USDC
3. Wait for the approval transaction to be confirmed
4. Click "Deposit USDC" to transfer your USDC to the Settlement Contract
5. Wait for the deposit transaction to be confirmed

### Balance Information
The UI displays three key balances:
- **Wallet Balance**: Your USDC balance in your wallet
- **Allowance**: The amount of USDC the Settlement Contract is allowed to spend
- **Deposited**: The amount of USDC you've deposited in the Settlement Contract

## Project Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── WalletConnect.jsx       # Wallet connection component
│   │   ├── WalletConnect.css       # Wallet connection styles
│   │   ├── DepositUSDC.jsx         # USDC deposit component
│   │   └── DepositUSDC.css         # Deposit component styles
│   ├── context/
│   │   └── WalletContext.jsx       # Wallet state management
│   ├── config.js                   # Network and contract configuration
│   ├── App.jsx                     # Main application component
│   └── main.jsx                    # Application entry point
└── package.json
```

## Technologies Used

- **React 19**: UI framework
- **Vite**: Build tool and dev server
- **Ethers.js v6**: Ethereum library for Web3 interactions
- **MetaMask**: Browser wallet for Ethereum-compatible chains
