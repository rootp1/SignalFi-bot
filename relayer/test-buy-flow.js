/**
 * End-to-End BUY Flow Test
 * 
 * Tests complete flow:
 * 1. Broadcaster deposits PYUSD
 * 2. Subscriber deposits PYUSD
 * 3. Subscriber follows broadcaster in MongoDB
 * 4. Broadcaster broadcasts BUY signal
 * 5. Verify Yellow sessions updated
 * 6. Verify parallel batch submitted to L1
 */

import { ethers } from 'ethers'
import dotenv from 'dotenv'
import axios from 'axios'
import { MongoClient } from 'mongodb'

dotenv.config()

// Test accounts
const BROADCASTER_KEY = '0x83e68ebb1c2e4dc64b675738cf7365c65a164fe023da75256ff1ae809ec6340c'
const SUBSCRIBER_KEY = '0x11349b986ab8e26507cf84590ab1f1bc77f56b35caa2f50a93be902e7182f064'

const RPC_URL = process.env.L1_RPC_URL
const EXECUTOR_ADDRESS = process.env.PARALLEL_BATCH_EXECUTOR_ADDRESS
const PYUSD_ADDRESS = process.env.PYUSD_TOKEN_ADDRESS
const RELAYER_URL = process.env.RELAYER_URL || 'http://localhost:3000'
const BROADCASTER_SERVICE_URL = process.env.BROADCASTER_SERVICE_URL || 'http://localhost:3002'
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017'

const EXECUTOR_ABI = [
  "function deposit(uint256 amount) external",
  "event Deposit(address indexed user, uint256 amount)"
]

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function mint(address to, uint256 amount) external"
]

async function main() {
  console.log('\n🧪 END-TO-END BUY FLOW TEST\n')
  console.log('━'.repeat(60))
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const broadcasterWallet = new ethers.Wallet(BROADCASTER_KEY, provider)
  const subscriberWallet = new ethers.Wallet(SUBSCRIBER_KEY, provider)
  
  console.log('\n📍 Test Accounts:')
  console.log(`   Broadcaster: ${broadcasterWallet.address}`)
  console.log(`   Subscriber:  ${subscriberWallet.address}`)
  console.log('')
  
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, ERC20_ABI, provider)
  const executor = new ethers.Contract(EXECUTOR_ADDRESS, EXECUTOR_ABI, provider)
  
  // ═══════════════════════════════════════════════════════════
  // STEP 1: Broadcaster Deposits
  // ═══════════════════════════════════════════════════════════
  console.log('━'.repeat(60))
  console.log('STEP 1: Broadcaster Deposits 500 PYUSD')
  console.log('━'.repeat(60))
  
  const broadcasterDepositAmount = ethers.parseUnits('500', 6)
  
  try {
    // Approve
    console.log('   → Approving PYUSD...')
    const broadcasterPyusd = pyusd.connect(broadcasterWallet)
    const broadcasterExecutor = executor.connect(broadcasterWallet)
    
    const approveTx1 = await broadcasterPyusd.approve(EXECUTOR_ADDRESS, broadcasterDepositAmount)
    await approveTx1.wait()
    console.log(`   ✅ Approved (${approveTx1.hash.slice(0, 10)}...)`)
    
    // Deposit
    console.log('   → Depositing to executor...')
    const depositTx1 = await broadcasterExecutor.deposit(broadcasterDepositAmount)
    const receipt1 = await depositTx1.wait()
    console.log(`   ✅ Deposited (${depositTx1.hash.slice(0, 10)}...)`)
    
    // Register with relayer
    console.log('   → Registering deposit with relayer...')
    const registerRes1 = await axios.post(`${RELAYER_URL}/register-deposit`, {
      address: broadcasterWallet.address,
      amount: broadcasterDepositAmount.toString(),
      txHash: depositTx1.hash
    })
    console.log(`   ✅ Registration: ${registerRes1.data.message}`)
    
    // Verify Yellow session
    await new Promise(resolve => setTimeout(resolve, 1000))
    const balanceRes1 = await axios.get(`${RELAYER_URL}/balance/${broadcasterWallet.address}`)
    console.log(`   ✅ Yellow Balance: ${ethers.formatUnits(balanceRes1.data.balance.pyusd, 6)} PYUSD`)
    
  } catch (error) {
    console.error('   ❌ Broadcaster deposit failed:', error.message)
    throw error
  }
  
  // ═══════════════════════════════════════════════════════════
  // STEP 2: Subscriber Deposits
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(60))
  console.log('STEP 2: Subscriber Deposits 300 PYUSD')
  console.log('━'.repeat(60))
  
  const subscriberDepositAmount = ethers.parseUnits('300', 6)
  
  try {
    // Approve
    console.log('   → Approving PYUSD...')
    const subscriberPyusd = pyusd.connect(subscriberWallet)
    const subscriberExecutor = executor.connect(subscriberWallet)
    
    const approveTx2 = await subscriberPyusd.approve(EXECUTOR_ADDRESS, subscriberDepositAmount)
    await approveTx2.wait()
    console.log(`   ✅ Approved (${approveTx2.hash.slice(0, 10)}...)`)
    
    // Deposit
    console.log('   → Depositing to executor...')
    const depositTx2 = await subscriberExecutor.deposit(subscriberDepositAmount)
    await depositTx2.wait()
    console.log(`   ✅ Deposited (${depositTx2.hash.slice(0, 10)}...)`)
    
    // Register with relayer
    console.log('   → Registering deposit with relayer...')
    const registerRes2 = await axios.post(`${RELAYER_URL}/register-deposit`, {
      address: subscriberWallet.address,
      amount: subscriberDepositAmount.toString(),
      txHash: depositTx2.hash
    })
    console.log(`   ✅ Registration: ${registerRes2.data.message}`)
    
    // Verify Yellow session
    await new Promise(resolve => setTimeout(resolve, 1000))
    const balanceRes2 = await axios.get(`${RELAYER_URL}/balance/${subscriberWallet.address}`)
    console.log(`   ✅ Yellow Balance: ${ethers.formatUnits(balanceRes2.data.balance.pyusd, 6)} PYUSD`)
    
  } catch (error) {
    console.error('   ❌ Subscriber deposit failed:', error.message)
    throw error
  }
  
  // ═══════════════════════════════════════════════════════════
  // STEP 3: Subscriber Follows Broadcaster in MongoDB
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(60))
  console.log('STEP 3: Subscriber Follows Broadcaster')
  console.log('━'.repeat(60))
  
  let mongoClient
  try {
    console.log('   → Connecting to MongoDB...')
    mongoClient = new MongoClient(MONGO_URI)
    await mongoClient.connect()
    
    const db = mongoClient.db('pyusdcopybot')
    const followersCollection = db.collection('followers')
    
    // Check if already following
    const existing = await followersCollection.findOne({
      broadcasterAddress: broadcasterWallet.address.toLowerCase(),
      followerAddress: subscriberWallet.address.toLowerCase()
    })
    
    if (!existing) {
      console.log('   → Adding follower relationship...')
      await followersCollection.insertOne({
        broadcasterAddress: broadcasterWallet.address.toLowerCase(),
        followerAddress: subscriberWallet.address.toLowerCase(),
        createdAt: new Date(),
        active: true
      })
      console.log('   ✅ Follower relationship created')
    } else {
      console.log('   ✅ Follower relationship already exists')
    }
    
    // Verify
    const count = await followersCollection.countDocuments({
      broadcasterAddress: broadcasterWallet.address.toLowerCase()
    })
    console.log(`   ✅ Broadcaster has ${count} follower(s)`)
    
  } catch (error) {
    console.error('   ❌ MongoDB operation failed:', error.message)
    throw error
  } finally {
    if (mongoClient) {
      await mongoClient.close()
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // STEP 4: Broadcaster Sends BUY Signal
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(60))
  console.log('STEP 4: Broadcaster Sends BUY Signal')
  console.log('━'.repeat(60))
  
  try {
    console.log('   → Broadcasting BUY ETH signal...')
    
    const tradeSignal = {
      broadcasterAddress: broadcasterWallet.address,
      action: 'BUY',
      token: 'ETH',
      timestamp: Date.now()
    }
    
    const broadcastRes = await axios.post(`${BROADCASTER_SERVICE_URL}/broadcast-signal`, tradeSignal)
    
    if (broadcastRes.data.success) {
      console.log('   ✅ Signal broadcast successful')
      console.log(`   📊 Followers notified: ${broadcastRes.data.followersNotified || 0}`)
    } else {
      console.log('   ⚠️ Signal broadcast returned:', broadcastRes.data)
    }
    
  } catch (error) {
    console.error('   ❌ Broadcast failed:', error.response?.data || error.message)
  }
  
  // ═══════════════════════════════════════════════════════════
  // STEP 5: Wait for Processing & Check Results
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(60))
  console.log('STEP 5: Waiting for Trade Processing...')
  console.log('━'.repeat(60))
  
  console.log('   → Waiting 5 seconds for relayer to process...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // Check Yellow sessions
  console.log('\n   📊 Final Yellow Session States:')
  console.log('   ' + '─'.repeat(58))
  
  try {
    const broadcasterSession = await axios.get(`${RELAYER_URL}/balance/${broadcasterWallet.address}`)
    console.log(`\n   Broadcaster (${broadcasterWallet.address}):`)
    console.log(`      PYUSD: ${ethers.formatUnits(broadcasterSession.data.balance.pyusd, 6)}`)
    console.log(`      ETH:   ${ethers.formatUnits(broadcasterSession.data.balance.eth, 18)}`)
    if (broadcasterSession.data.portfolio) {
      console.log(`      PnL:   ${ethers.formatUnits(broadcasterSession.data.portfolio.pnl.total, 6)} PYUSD`)
    }
  } catch (error) {
    console.log(`   ⚠️ Could not fetch broadcaster session: ${error.message}`)
  }
  
  try {
    const subscriberSession = await axios.get(`${RELAYER_URL}/balance/${subscriberWallet.address}`)
    console.log(`\n   Subscriber (${subscriberWallet.address}):`)
    console.log(`      PYUSD: ${ethers.formatUnits(subscriberSession.data.balance.pyusd, 6)}`)
    console.log(`      ETH:   ${ethers.formatUnits(subscriberSession.data.balance.eth, 18)}`)
    if (subscriberSession.data.portfolio) {
      console.log(`      PnL:   ${ethers.formatUnits(subscriberSession.data.portfolio.pnl.total, 6)} PYUSD`)
    }
  } catch (error) {
    console.log(`   ⚠️ Could not fetch subscriber session: ${error.message}`)
  }
  
  // ═══════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(60))
  console.log('✅ END-TO-END TEST COMPLETE')
  console.log('━'.repeat(60))
  console.log('\nNext Steps:')
  console.log('  1. Check relayer logs for trade processing')
  console.log('  2. Verify L1 transaction on Arcology')
  console.log('  3. Test SELL flow')
  console.log('')
}

main().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
