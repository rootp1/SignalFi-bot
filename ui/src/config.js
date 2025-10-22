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
  USDC: '0xfbC451FBd7E17a1e7B18347337657c1F2c52B631',
  WETH: '0x2249977665260A63307Cf72a4D65385cC0817CB5',
  AMM: '0x663536Ee9E60866DC936D2D65c535e795f4582D1',
  SETTLEMENT: '0x010e5c3c0017b8009E926c39b072831065cc7Dc2'
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
