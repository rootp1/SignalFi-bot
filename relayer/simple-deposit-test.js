/**
 * Simple deposit test - deposits 200 PYUSD and checks Yellow session
 */

import { ethers } from 'ethers'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

const RPC_URL = process.env.L1_RPC_URL
const EXECUTOR_ADDRESS = process.env.PARALLEL_BATCH_EXECUTOR_ADDRESS
const PYUSD_ADDRESS = process.env.PYUSD_TOKEN_ADDRESS
const DEPLOYER_KEY = process.env.RELAYER_PRIVATE_KEY

const EXECUTOR_ABI = [
  "function deposit(uint256 amount) external",
  "event Deposit(address indexed user, uint256 amount)"
]

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
]

async function main() {
  console.log('\n💰 Simple Deposit Test\n')
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider)
  
  console.log(`📍 User: ${wallet.address}`)
  console.log(`📍 Executor: ${EXECUTOR_ADDRESS}`)
  console.log(`📍 PYUSD: ${PYUSD_ADDRESS}`)
  
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, ERC20_ABI, wallet)
  const executor = new ethers.Contract(EXECUTOR_ADDRESS, EXECUTOR_ABI, wallet)
  
  const depositAmount = ethers.parseUnits("200", 6) // 200 PYUSD
  
  console.log(`\n📥 Depositing ${ethers.formatUnits(depositAmount, 6)} PYUSD...`)
  
  // Approve
  console.log('   1/3: Approving...')
  const approveTx = await pyusd.approve(EXECUTOR_ADDRESS, depositAmount)
  await approveTx.wait()
  console.log(`   ✅ Approved (${approveTx.hash.slice(0, 10)}...)`)
  
  // Deposit
  console.log('   2/3: Depositing...')
  const depositTx = await executor.deposit(depositAmount)
  const receipt = await depositTx.wait()
  console.log(`   ✅ Deposited (${depositTx.hash.slice(0, 10)}...)`)
  
  // Register deposit with relayer
  console.log('   3/3: Registering deposit with relayer...')
  const registerResponse = await axios.post('http://localhost:3000/register-deposit', {
    address: wallet.address,
    amount: depositAmount.toString(),
    txHash: depositTx.hash
  })
  console.log(`   ✅ Registration: ${registerResponse.data.message}`)
  
  // Wait a moment for session to be created
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Check Yellow session
  console.log(`\n🔍 Checking Yellow session...`)
  const response = await axios.get(`http://localhost:3000/balance/${wallet.address}`)
  
  console.log('\n📊 Yellow Session:')
  console.log(JSON.stringify(response.data, null, 2))
  
  const pyusdBalance = response.data.balance?.pyusd || response.data.positions?.pyusd
  console.log(`\n💵 PYUSD Balance: ${pyusdBalance || '0'}`)
  
  if (pyusdBalance && pyusdBalance !== '0') {
    console.log(`✅ SUCCESS! Yellow session has ${ethers.formatUnits(pyusdBalance, 6)} PYUSD\n`)
  } else {
    console.log(`⚠️ WARNING: Yellow session shows 0 PYUSD balance\n`)
    console.log(`   This means L1Listener didn't create the session properly`)
    console.log(`   Check relayer logs for errors\n`)
  }
}

main().catch(console.error)
