// Arcology Devnet Configuration
export const NETWORK_CONFIG = {
  chainId: 118,
  chainIdHex: '0x76',
  chainName: 'Arcology Devnet',
  rpcUrl: 'https://achievement-acts-content-guys.trycloudflare.com',
  blockExplorerUrl: '', // Add if available
  nativeCurrency: {
    name: 'ARC',
    symbol: 'ARC',
    decimals: 18
  }
};

// Contract Addresses - PyUSDCopyBot Deployment (2025-10-24 - $500k Liquidity)
export const CONTRACTS = {
  // Legacy contracts (old deployment)
  USDC: '0x9d811801f7154B35AE54C75C4EB16e265D9a382C',
  SETTLEMENT: '0xD92536118A234E7f5a9388Ec8dB95e90F8a1130B',
  
  // New PyUSDCopyBot contracts - LATEST DEPLOYMENT
  MockPYUSD: '0x694D208b3F6edA287128f6c80E0fA4fe1B5e8F60',
  WETH: '0xE7D0fbDe97522D441563abA8EEaC7531f103A88d',
  AMM: '0x309eCed01E331F3128F34932F5971E4127D2c6E6',
  ParallelBatchExecutor: '0xAc99Da7BFE237C6C7c703C876e4ABAF927BE9FB4',
  BroadcasterRegistry: '0x9a08A2c0ce632B482C936bcEc7d3b02151e71d00',
  PyUSDFaucet: '0x3102aEaD990606C09646AdEe5B8fDCAfF6F52B68',
  ARCFaucet: '0x2410Aa3077b5F99d9FA6cad64703CFfD482B2023'
};

// Token Configuration
export const PYUSD_DECIMALS = 6;  // PayPal USD uses 6 decimals
export const USDC_DECIMALS = 6;
export const WETH_DECIMALS = 18;

// ERC20 ABI (minimal for approve and balanceOf)
export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function symbol() public view returns (string)',
  'function transfer(address to, uint256 amount) public returns (bool)'
];

// Settlement Contract ABI (for deposit function)
export const SETTLEMENT_ABI = [
  'function deposit(uint256 amount) external',
  'function deposits(address user) public view returns (uint256)',
  'function getDeposit(address user) public view returns (uint256)',
  'function withdraw(uint256 amount) external',
  'event Deposit(address indexed user, uint256 amount)'
];
