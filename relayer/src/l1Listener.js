import { ethers } from 'ethers'
import config from './config.js'
import { openChannelForUser } from './sessionManager.js'
const SETTLEMENT_ABI = [
  "event Deposit(address indexed user, uint256 amount, uint256 timestamp)",
  "function deposits(address) view returns (uint256)"
]

class L1Listener {
  constructor() {
    this.provider = null
    this.settlementContract = null
  }

  async initialize() {
    console.log('🔗 Connecting to Arcology L1...')
    
    this.provider = new ethers.JsonRpcProvider(config.l1.rpcUrl)
    
    this.settlementContract = new ethers.Contract(
      config.l1.settlementContract,
      SETTLEMENT_ABI,
      this.provider
    );

    console.log('✅ L1 connection established');
  }

  async watchDeposits() {
    console.log('👀 Watching for deposits...')
    
    this.settlementContract.on('Deposit', async (user, amount, timestamp) => {
      console.log(`💰 Deposit detected: ${user} deposited ${ethers.formatUnits(amount, 6)} USDC`)
      
      try {
    
        await openChannelForUser(user, amount)
      } catch (error) {
        console.error('Failed to open channel:', error)
      }
    })
  }

  async getUserDeposit(userAddress) {
    const amount = await this.settlementContract.deposits(userAddress)
    return amount;
  }
}

export default new L1Listener()