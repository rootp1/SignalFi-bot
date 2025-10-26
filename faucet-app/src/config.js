// Network Configuration
export const NETWORK_CONFIG = {
  chainId: '0x76', // 118 in hex
  chainName: 'Arcology Devnet',
  nativeCurrency: {
    name: 'Arcology',
    symbol: 'ARC',
    decimals: 18
  },
  rpcUrls: ['https://achievement-acts-content-guys.trycloudflare.com'],
  blockExplorerUrls: []
};

// Contract Addresses (Arcology-Compatible Deployment - Unlimited PYUSD)
export const PYUSD_ADDRESS = '0x6227c6D08dCF35caf085C3e9BA5a785D092c7975';
export const AMM_ADDRESS = '0x0212586E531810A4A7CBc76dc01A7539e5859232';
export const PYUSD_FAUCET_ADDRESS = '0x5B5D3eB216B3DDF6d0EC24f1184B263B9C4eB1aa';
export const ARCFAUCET_ADDRESS = '0x697ec77791EEb759eaf1B9ad515E35DBAeBb455c';
// Faucet Server URL
export const FAUCET_SERVER_URL = 'http://localhost:3001';

// ERC20 ABI (Arcology event-based pattern)
export const ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external", // Returns via BalanceQuery event
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event BalanceQuery(address indexed account, uint256 balance)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// ARC Faucet ABI
export const FAUCET_ABI = [
  "function claimARC() external",
  "function getFaucetBalance() view returns (uint256)",
  "function getTimeUntilNextClaim(address user) view returns (uint256)"
];

// PYUSD Faucet ABI (Arcology pattern - no cooldown)
export const PYUSD_FAUCET_ABI = [
  "function claimPYUSD() external",
  "event PYUSDClaimed(address indexed claimer, uint256 amount, uint256 timestamp)"
];
