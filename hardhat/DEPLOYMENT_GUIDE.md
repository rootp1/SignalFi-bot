# SignalFi-Bot Deployment Guide

## Overview

This project implements a production-ready trading settlement system on Arcology Network with:
- **MockERC20**: Testing tokens (USDC, WETH)
- **AmmContract**: Real constant-product AMM (x*y=k) with 0.3% fees
- **SettlementContract**: Concurrent-safe trade settlement using Arcology's U256Cumulative

## Architecture

### Contracts

#### 1. MockERC20.sol (`contracts/src/MockERC20.sol`)
- Standard ERC20 with configurable decimals
- Mint function for testing
- USDC: 6 decimals, WETH: 18 decimals

#### 2. AmmContract.sol (`contracts/src/AmmContract.sol`)
- **Constant Product Formula**: x * y = k
- **Fee**: 0.3% (3/1000) on swaps
- **Functions**:
  - `addLiquidity(uint256 amountUSDC, uint256 amountWETH)`: Add liquidity to pool
  - `swap(address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOutMin)`: Execute swap
  - `getAmountOut(uint256 amountIn, address tokenIn, address tokenOut)`: Calculate output amount
  - `getReserves()`: Get current reserves

#### 3. SettlementContract.sol (`contracts/src/SettlementContract.sol`)
- **Concurrent-Safe**: Uses `U256Cumulative` from `@arcologynetwork/concurrentlib`
- **Functions**:
  - `deposit(uint256 amount)`: Deposit USDC
  - `getDeposit(address user)`: View user deposits
  - `settleTrades(bytes[] calldata bundled_agreements)`: **CONCURRENT-SAFE** batch settlement
  - `forceWithdraw(bytes calldata signed_withdrawal_message)`: Signed withdrawal

**settleTrades() Flow**:
1. Validate signatures for all trade agreements
2. Aggregate buy/sell orders
3. Execute net swap on AMM
4. Update user deposits (concurrent-safe with U256Cumulative)

## Installation

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile
```

## Network Configuration

- **Network**: Arcology Devnet (TestnetInfo)
- **RPC URL**: https://yttric-socorro-maniacally.ngrok-free.dev
- **Accounts**: Pre-configured in `network.json`

## Deployment

```bash
# Deploy all contracts to TestnetInfo
npm run deploy

# Or use hardhat directly
npx hardhat run scripts/deploy.js --network TestnetInfo
```

### Deployment Output

The script will:
1. Deploy USDC and WETH tokens
2. Deploy AmmContract
3. Deploy SettlementContract
4. Fund AMM with initial liquidity (20,000 USDC : 10 WETH = 2000 USDC/WETH)

## Testing

```bash
# Run comprehensive test suite
npm run test

# Or use hardhat directly
npx hardhat run test/test-settlement.js --network TestnetInfo
```

### Test Coverage

The test suite includes:
- ✅ Token deployment
- ✅ AMM deployment and liquidity addition
- ✅ Settlement contract deployment
- ✅ User deposits (sequential)
- ✅ **Concurrent deposits** (6 parallel transactions)
- ✅ AMM swap functionality
- ✅ Withdrawal with signature verification

## Key Features

### 1. Concurrency Support

The `settleTrades()` function is **concurrent-safe** thanks to Arcology's `U256Cumulative`:

```solidity
mapping(address => U256Cumulative) private depositsMap;

// Concurrent-safe operations
depositsMap[trader].add(amount);  // Thread-safe increment
depositsMap[trader].sub(cost);    // Thread-safe decrement
```

Multiple `settleTrades()` calls can execute in parallel without race conditions.

### 2. Real AMM Implementation

Not a mock - implements full constant product formula:

```
amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
```

### 3. Trade Netting

Aggregates buy/sell orders before executing single AMM swap for capital efficiency.

### 4. No Pyth Oracle

All oracle dependencies removed as per requirements.

## Contract Addresses (After Deployment)

After running deployment, note the addresses printed:

```
Contract Addresses:
USDC: 0x...
WETH: 0x...
AMM: 0x...
Settlement: 0x...
```

## Project Structure

```
SignalFi-bot/
├── contracts/src/
│   ├── MockERC20.sol          # ERC20 tokens for testing
│   ├── AmmContract.sol         # Constant-product AMM
│   └── SettlementContract.sol  # Concurrent-safe settlement
├── test/
│   └── test-settlement.js      # Comprehensive test suite
├── scripts/
│   └── deploy.js               # Deployment script
├── hardhat.config.js           # Hardhat configuration
├── network.json                # Network configuration
└── package.json                # Dependencies
```

## Dependencies

- **Hardhat**: Smart contract development framework
- **@openzeppelin/contracts**: ERC20 implementation
- **@arcologynetwork/concurrentlib**: Concurrent data structures
- **@arcologynetwork/frontend-util**: Parallel transaction utilities
- **ethers.js**: Ethereum library

## Signature Formats

### Trade Agreement
```javascript
abi.encode(
  ['address', 'bool', 'uint256', 'uint8', 'bytes32', 'bytes32'],
  [trader, isBuy, amount, v, r, s]
)
```

### Withdrawal Message
```javascript
abi.encode(
  ['address', 'uint256', 'uint8', 'bytes32', 'bytes32'],
  [user, amount, v, r, s]
)
```

## Next Steps

1. **Deploy**: Run `npm run deploy`
2. **Test**: Run `npm run test`
3. **Integration**: Connect relayer and broadcaster services
4. **Production**: Replace MockERC20 with real token addresses

## Security Considerations

- All user signatures are verified using `ecrecover`
- Only designated relayer can call `settleTrades()`
- Concurrent operations use Arcology's audited concurrent library
- AMM includes slippage protection (`amountOutMin`)

## Troubleshooting

### Compilation Issues
```bash
# Clear cache and recompile
rm -rf cache artifacts
npx hardhat compile
```

### Network Connection
Verify Arcology devnet is running at https://yttric-socorro-maniacally.ngrok-free.dev

### Insufficient Funds
Ensure deployer account has sufficient balance on TestnetInfo network

## Support

For issues or questions:
- Check Arcology Network documentation
- Review Hardhat documentation
- Verify network connectivity

---

**Status**: ✅ All contracts production-ready and fully implemented
**Network**: Arcology TestnetInfo
**Compiler**: Solidity 0.8.19
