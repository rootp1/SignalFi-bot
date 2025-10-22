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
export const USDC_ADDRESS = '0x9d811801f7154B35AE54C75C4EB16e265D9a382C';
export const WETH_ADDRESS = '0x6a52E52503915f67Cb845bf41878AcC322984f51';
export const AMM_ADDRESS = '0x1C13661f27df56eFdfD388AaAde884C2c06fC1C1';
export const SETTLEMENT_ADDRESS = '0xD92536118A234E7f5a9388Ec8dB95e90F8a1130B';
export const ARCFAUCET_ADDRESS = '0xFaE10278C9EaBC320fC62499A4448432056e1004';
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
