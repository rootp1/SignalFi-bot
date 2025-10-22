// Arcology Devnet Configuration
export const NETWORK_CONFIG = {
  chainId: 118,
  chainIdHex: '0x76',
  chainName: 'Arcology Devnet',
  rpcUrl: 'https://yttric-socorro-maniacally.ngrok-free.dev',
  blockExplorerUrl: '', // Add if available
  nativeCurrency: {
    name: 'ARC',
    symbol: 'ARC',
    decimals: 18
  }
};

// Contract Addresses
export const CONTRACTS = {
  USDC: '0x9d811801f7154B35AE54C75C4EB16e265D9a382C',
  WETH: '0x6a52E52503915f67Cb845bf41878AcC322984f51',
  AMM: '0x1C13661f27df56eFdfD388AaAde884C2c06fC1C1',
  SETTLEMENT: '0xD92536118A234E7f5a9388Ec8dB95e90F8a1130B'
};

// Token Configuration
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
