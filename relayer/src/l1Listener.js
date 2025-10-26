import { ethers } from 'ethers'
import config from './config.js'
import { openChannelForUser } from './sessionManager.js'


const PYUSD_VAULT_ABI = [
  "event Deposit(address indexed user, uint256 amount, uint256 timestamp)",
  "event Withdrawal(address indexed user, uint256 amount, uint256 timestamp)",
  "function deposits(address) view returns (uint256)",
  "function getUserBalance(address user) view returns (uint256 pyusd, uint256 eth)"
]

class L1Listener {
  constructor() {
    this.provider = null;
    this.vaultContract = null;
    this.isWatching = false;
    this.blocksSeen = new Set()
  }

  async initialize() {
    console.log('🔗 Connecting to Arcology L1...')
    console.log(`   RPC: ${config.l1.rpcUrl}`)
    console.log(`   Chain ID: ${config.l1.chainId}`)
    
    try {
      this.provider = new ethers.JsonRpcProvider(config.l1.rpcUrl)
      

      const network = await this.provider.getNetwork()
      console.log(`   ✅ Connected to network: ${network.name} (${network.chainId})`)
 
      const blockNumber = await this.provider.getBlockNumber()
      console.log(`   📦 Latest block: ${blockNumber}`)
      
    } catch (error) {
      console.error('   ❌ Failed to connect to network:', error.message)
      throw error
    }
    
    this.vaultContract = new ethers.Contract(
      config.l1.pyusdVault,
      PYUSD_VAULT_ABI,
      this.provider
    )

    console.log(`   📝 PyUSDVault Contract: ${config.l1.pyusdVault}`)
    console.log(`   💰 PYUSD Token: ${config.l1.pyusd}`)
    console.log('✅ L1 connection established')
  }

  async watchDeposits() {
    if (this.isWatching) {
      console.log('⚠️ Already watching for deposits')
      return
    }

    console.log('👀 Watching for PYUSD deposits...')
    console.log(`   Contract: ${config.l1.pyusdVault}`)
    this.isWatching = true
    

    this.vaultContract.on('Deposit', async (user, amount, timestamp, event) => {
      
      const eventId = `${event.log.blockNumber}-${event.log.transactionIndex}`
      if (this.blocksSeen.has(eventId)) {
        return;
      }
      this.blocksSeen.add(eventId)

      const amountInPyusd = ethers.formatUnits(amount, 6)
      
      console.log('═══════════════════════════════════════')
      console.log('💰 DEPOSIT DETECTED')
      console.log(`   User: ${user}`)
      console.log(`   Amount: ${amountInPyusd} PYUSD`)
      console.log(`   Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`)
      console.log(`   Block: ${event.log.blockNumber}`)
      console.log(`   Tx: ${event.log.transactionHash}`)
      console.log('═══════════════════════════════════════')
      
      try {
        
        await openChannelForUser(user, amount.toString())
        console.log(`✅ Yellow channel processing initiated for ${user}`)
      } catch (error) {
        console.error(`❌ Failed to open channel for ${user}:`, error.message)
      }
    })

  
    try {
      const currentBlock = await this.provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 1000)
      
      console.log(`🔍 Scanning for past deposits (blocks ${fromBlock} to ${currentBlock})...`)
      
      const filter = this.vaultContract.filters.Deposit()
      const pastEvents = await this.vaultContract.queryFilter(filter, fromBlock, currentBlock)
      
      if (pastEvents.length > 0) {
        console.log(`📜 Found ${pastEvents.length} past deposit(s)`)
        
        for (const event of pastEvents) {
          const { user, amount, timestamp } = event.args
          const amountInPyusd = ethers.formatUnits(amount, 6)
          
          console.log(`   - ${user}: ${amountInPyusd} PYUSD at block ${event.blockNumber}`)
          
          try {
            await openChannelForUser(user, amount.toString())
          } catch (error) {
            console.error(`   ❌ Error processing past deposit: ${error.message}`)
          }
        }
      } else {
        console.log('   No past deposits found')
      }
    } catch (error) {
      console.error('⚠️ Error scanning past events:', error.message)
    }

   
    this.vaultContract.on('Withdrawal', (user, amount, timestamp) => {
      const amountInPyusd = ethers.formatUnits(amount, 6)
      console.log(`💸 WITHDRAWAL: ${user} withdrew ${amountInPyusd} PYUSD`)
    })

    console.log('✅ Event listeners active')
  }

  async getUserDeposit(userAddress) {
    try {
      const amount = await this.vaultContract.deposits(userAddress)
      return amount.toString()
    } catch (error) {
      console.error(`Error checking deposit for ${userAddress}:`, error.message)
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
      console.error(`Error checking balances for ${userAddress}:`, error.message)
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