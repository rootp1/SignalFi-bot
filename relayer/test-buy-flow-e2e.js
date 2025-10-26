/**
 * End-to-End BUY Flow Test
 * Tests the complete flow from deposit to trade execution
 */

import { ethers } from 'ethers'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

// Test accounts
const BROADCASTER_KEY = '0x83e68ebb1c2e4dc64b675738cf7365c65a164fe023da75256ff1ae809ec6340c'
const SUBSCRIBER_KEY = '0x11349b986ab8e26507cf84590ab1f1bc77f56b35caa2f50a93be902e7182f064'

const BROADCASTER_ADDRESS = '0xF53EC3ea43AbF6fdD0CD9Eb02111cA03e65c0345'
const SUBSCRIBER_ADDRESS = '0xE723131DE401C572e94621165403d0335c2327bB'

// Config
const RPC_URL = process.env.L1_RPC_URL
const RELAYER_URL = 'http://localhost:3000'
const BROADCASTER_SERVICE_URL = 'http://localhost:3002'

const EXECUTOR_ADDRESS = process.env.PARALLEL_BATCH_EXECUTOR_ADDRESS
const PYUSD_ADDRESS = process.env.PYUSD_TOKEN_ADDRESS

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
  console.log('\n🎯 END-TO-END BUY FLOW TEST\n')
  console.log('═══════════════════════════════════════')
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const broadcasterWallet = new ethers.Wallet(BROADCASTER_KEY, provider)
  const subscriberWallet = new ethers.Wallet(SUBSCRIBER_KEY, provider)
  
  console.log(`📡 Broadcaster: ${BROADCASTER_ADDRESS}`)
  console.log(`📡 Subscriber:  ${SUBSCRIBER_ADDRESS}`)
  console.log('═══════════════════════════════════════\n')
  
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, ERC20_ABI, provider)
  const executor = new ethers.Contract(EXECUTOR_ADDRESS, EXECUTOR_ABI, provider)
  
  // STEP 1: Mint PYUSD to both accounts
  console.log('💰 STEP 1/6: Minting PYUSD...')
  try {
    const deployerKey = process.env.RELAYER_PRIVATE_KEY
    const deployerWallet = new ethers.Wallet(deployerKey, provider)
    const pyusdWithSigner = pyusd.connect(deployerWallet)
    
    console.log('   Minting 10,000 PYUSD to broadcaster...')
    const mintTx1 = await pyusdWithSigner.mint(BROADCASTER_ADDRESS, ethers.parseUnits('10000', 6))
    await mintTx1.wait()
    
    console.log('   Minting 5,000 PYUSD to subscriber...')
    const mintTx2 = await pyusdWithSigner.mint(SUBSCRIBER_ADDRESS, ethers.parseUnits('5000', 6))
    await mintTx2.wait()
    
    console.log('   ✅ PYUSD minted successfully\n')
  } catch (error) {
    console.log(`   ⚠️ Minting skipped (may already have funds): ${error.message}\n`)
  }
  
  // STEP 2: Broadcaster deposits
  console.log('💵 STEP 2/6: Broadcaster deposits 1,000 PYUSD...')
  const broadcasterDepositAmount = ethers.parseUnits('1000', 6)
  
  const pyusdBroadcaster = pyusd.connect(broadcasterWallet)
  const executorBroadcaster = executor.connect(broadcasterWallet)
  
  console.log('   Approving...')
  const approveTx1 = await pyusdBroadcaster.approve(EXECUTOR_ADDRESS, broadcasterDepositAmount)
  await approveTx1.wait()
  
  console.log('   Depositing...')
  const depositTx1 = await executorBroadcaster.deposit(broadcasterDepositAmount)
  const receipt1 = await depositTx1.wait()
  
  console.log('   Registering with relayer...')
  await axios.post(`${RELAYER_URL}/register-deposit`, {
    address: BROADCASTER_ADDRESS,
    amount: broadcasterDepositAmount.toString(),
    txHash: receipt1.hash
  })
  
  console.log(`   ✅ Broadcaster deposited (tx: ${receipt1.hash.slice(0, 10)}...)\n`)
  
  // STEP 3: Subscriber deposits
  console.log('💵 STEP 3/6: Subscriber deposits 500 PYUSD...')
  const subscriberDepositAmount = ethers.parseUnits('500', 6)
  
  const pyusdSubscriber = pyusd.connect(subscriberWallet)
  const executorSubscriber = executor.connect(subscriberWallet)
  
  console.log('   Approving...')
  const approveTx2 = await pyusdSubscriber.approve(EXECUTOR_ADDRESS, subscriberDepositAmount)
  await approveTx2.wait()
  
  console.log('   Depositing...')
  const depositTx2 = await executorSubscriber.deposit(subscriberDepositAmount)
  const receipt2 = await depositTx2.wait()
  
  console.log('   Registering with relayer...')
  await axios.post(`${RELAYER_URL}/register-deposit`, {
    address: SUBSCRIBER_ADDRESS,
    amount: subscriberDepositAmount.toString(),
    txHash: receipt2.hash
  })
  
  console.log(`   ✅ Subscriber deposited (tx: ${receipt2.hash.slice(0, 10)}...)\n`)
  
  // STEP 4: Check Yellow sessions
  console.log('📊 STEP 4/6: Verifying Yellow sessions...')
  
  const broadcasterSession = await axios.get(`${RELAYER_URL}/balance/${BROADCASTER_ADDRESS}`)
  console.log(`   Broadcaster balance: ${ethers.formatUnits(broadcasterSession.data.balance.pyusd, 6)} PYUSD`)
  
  const subscriberSession = await axios.get(`${RELAYER_URL}/balance/${SUBSCRIBER_ADDRESS}`)
  console.log(`   Subscriber balance: ${ethers.formatUnits(subscriberSession.data.balance.pyusd, 6)} PYUSD`)
  
  if (broadcasterSession.data.balance.pyusd === '0' || subscriberSession.data.balance.pyusd === '0') {
    throw new Error('❌ Yellow sessions not created properly!')
  }
  console.log('   ✅ Yellow sessions verified\n')
  
  // STEP 5: Subscriber follows broadcaster
  console.log('👥 STEP 5/6: Subscriber follows broadcaster...')
  try {
    await axios.post(`${RELAYER_URL}/follow`, {
      userAddress: SUBSCRIBER_ADDRESS,
      broadcasterAddress: BROADCASTER_ADDRESS
    })
    console.log('   ✅ Subscription created\n')
  } catch (error) {
    console.log(`   ⚠️ Follow request: ${error.response?.data?.error || error.message}\n`)
  }
  
  // STEP 6: Broadcaster executes BUY signal
  console.log('🎯 STEP 6/6: Broadcasting BUY ETH signal...')
  
  try {
    const buyResponse = await axios.post(`${RELAYER_URL}/broadcast-trade`, {
      broadcasterAddress: BROADCASTER_ADDRESS,
      direction: 'BUY_ETH',
      ethPrice: 3000
    })
    
    console.log('   ✅ BUY signal processed!')
    console.log(`   📊 Response:`, buyResponse.data)
    
    // Wait a moment for L1 settlement
    console.log('\n   ⏳ Waiting 5 seconds for L1 settlement...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Check updated Yellow sessions
    console.log('\n📊 Final Yellow State:')
    const finalBroadcaster = await axios.get(`${RELAYER_URL}/balance/${BROADCASTER_ADDRESS}`)
    const finalSubscriber = await axios.get(`${RELAYER_URL}/balance/${SUBSCRIBER_ADDRESS}`)
    
    console.log(`\n   Broadcaster:`)
    console.log(`      PYUSD: ${ethers.formatUnits(finalBroadcaster.data.balance.pyusd, 6)}`)
    console.log(`      ETH:   ${ethers.formatUnits(finalBroadcaster.data.balance.eth, 18)}`)
    
    console.log(`\n   Subscriber:`)
    console.log(`      PYUSD: ${ethers.formatUnits(finalSubscriber.data.balance.pyusd, 6)}`)
    console.log(`      ETH:   ${ethers.formatUnits(finalSubscriber.data.balance.eth, 18)}`)
    
  } catch (error) {
    console.error('\n   ❌ BUY signal failed:', error.response?.data || error.message)
    throw error
  }
  
  console.log('\n═══════════════════════════════════════')
  console.log('✅ END-TO-END TEST COMPLETE!')
  console.log('═══════════════════════════════════════\n')
}

main().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
