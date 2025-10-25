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

  async watchDeposits() {
    if (this.isWatching) {
      console.log('⚠️ Already watching for deposits')
      return
    }

    console.log('👀 Watching for PYUSD deposits...')
    this.isWatching = true
    
    
    this.vaultContract.on('Deposit', async (user, amount, timestamp, event) => {
      const amountInPyusd = ethers.formatUnits(amount, 6)
      
      console.log('═══════════════════════════════════════')

      console.log('💰 DEPOSIT DETECTED')
    console.log(`   User: ${user}`)
  console.log(`   Amount: ${amountInPyusd} PYUSD`);
    console.log(`   Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`)
      console.log(`   Block: ${event.log.blockNumber}`)
            console.log(`   Tx: ${event.log.transactionHash}`)
console.log('═══════════════════════════════════════')
      
      try {
        await openChannelForUser(user, amount.toString())
        
        console.log(`✅ Yellow channel opened for ${user}`)
        
      } catch (error) {
        console.error(`❌ Failed to open channel for ${user}:`, error)
      
      }
    })


    this.vaultContract.on('Withdrawal', (user, amount, timestamp) => {
      const amountInPyusd = ethers.formatUnits(amount, 6)
      console.log(`💸 WITHDRAWAL: ${user} withdrew ${amountInPyusd} PYUSD`)
    })

  
    this.vaultContract.on('TradeExecuted', (user, fromToken, toToken, amountIn, amountOut) => {
      console.log(`📊 TRADE EXECUTED:`)
      console.log(`   User: ${user}`)
    
  console.log(`   From: ${fromToken}`)
          console.log(`   To: ${toToken}`)
    
          console.log(`   Amount In: ${amountIn.toString()}`)
      console.log(`   Amount Out: ${amountOut.toString()}`)
    })
  }

  async getUserDeposit(userAddress) {
    try {
      const amount = await this.vaultContract.deposits(userAddress)
      return amount.toString()
    } catch (error) {
      console.error(`Error checking deposit for ${userAddress}:`, error)
      return '0'
    }
  }

  async getUserBalances(userAddress) {
    try {
      const [pyusd, eth] = await this.vaultContract.getUserBalance(userAddress)
      return {
        pyusd: pyusd.toString(),
        eth: eth.toString()
      }
    } catch (error) {
      console.error(`Error checking balances for ${userAddress}:`, error)
      return { pyusd: '0', eth: '0' }
    }
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
