import { ethers } from 'ethers'
import config from './config.js'
import { openChannelForUser } from './sessionManager.js'

const PYUSD_VAULT_ABI = [
  "event Deposit(address indexed user, uint256 amount, uint256 timestamp)",
  "event Withdrawal(address indexed user, uint256 amount, uint256 timestamp)",
  "event TradeExecuted(address indexed user, address fromToken, address toToken, uint256 amountIn, uint256 amountOut)",
  "function deposits(address) view returns (uint256)",
  "function getUserBalance(address user) view returns (uint256 pyusd, uint256 eth)"
]

class L1Listener {
  constructor() {
    this.provider = null
    this.vaultContract = null
    this.isWatching = false
  }

  async initialize() {
    console.log('🔗 Connecting to Arcology L1...')
    console.log(`   RPC: ${config.l1.rpcUrl}`)
    console.log(`   Chain ID: ${config.l1.chainId}`)
    
    this.provider = new ethers.JsonRpcProvider(config.l1.rpcUrl)
    
    
    try {
      const network = await this.provider.getNetwork()
      console.log(`   ✅ Connected to network: ${network.name} (${network.chainId})`)
    } catch (error) {
      console.error('   ❌ Failed to connect to network:', error.message)
      throw error
    }
    
    this.vaultContract = new ethers.Contract(
      config.l1.pyusdVault,
      PYUSD_VAULT_ABI,
      this.provider
    )

    console.log(`   Contract: ${config.l1.pyusdVault}`)
    console.log('✅ L1 connection established')
  }

  startWatching() {
    if (this.isWatching) {
      console.log('⚠️ Already watching for deposits')
      return
    }

    console.log('👀 Watching for broadcaster trades via /broadcast-trade API endpoint...')
    console.log('👀 Deposit detection via /register-deposit API endpoint (Arcology workaround)...')
    this.isWatching = true
    
    // NOTE: Arcology blockchain doesn't support:
    // - Real-time event listeners (.on() never triggers)
    // - Event querying (queryFilter returns 0 events)
    // - View function calls (eth_call returns "missing revert data")
    //
    // Solution: Manual deposit registration via /register-deposit API endpoint
    // Deposits must be registered manually after the transaction is confirmed
  }

  stopWatching() {
    if (this.vaultContract) {
      this.vaultContract.removeAllListeners()
      this.isWatching = false
      console.log('🛑 Stopped watching for events')
    }
  }
}

export default new L1Listener()
