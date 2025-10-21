// Network Configuration
export const NETWORK_CONFIG = {
  chainId: '0x76', // 118 in hex
  chainName: 'Arcology Devnet',
  nativeCurrency: {
    name: 'Arcology',
    symbol: 'ARC',
    decimals: 18
  },
  rpcUrls: ['https://yttric-socorro-maniacally.ngrok-free.dev'],
  blockExplorerUrls: []
};

// Contract Addresses (UPDATE THESE AFTER DEPLOYMENT!)
export const USDC_ADDRESS = '0xfbC451FBd7E17a1e7B18347337657c1F2c52B631';
export const WETH_ADDRESS = '0x2249977665260A63307Cf72a4D65385cC0817CB5';
export const AMM_ADDRESS = '0x663536Ee9E60866DC936D2D65c535e795f4582D1';
export const SETTLEMENT_ADDRESS = '0x010e5c3c0017b8009E926c39b072831065cc7Dc2';
// Faucet Server URL
export const FAUCET_SERVER_URL = 'http://localhost:3001';

// ERC20 ABI (only functions we need)
export const ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// ARC Faucet ABI
export const FAUCET_ABI = [
  "function claimARC() external",
  "function getFaucetBalance() view returns (uint256)",
  "function getTimeUntilNextClaim(address user) view returns (uint256)"
];
