/**
 * Mint PYUSD to test user (using deployer key)
 */

import { ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

const RPC_URL = process.env.L1_RPC_URL
const PYUSD_ADDRESS = process.env.PYUSD_TOKEN_ADDRESS
const DEPLOYER_KEY = process.env.RELAYER_PRIVATE_KEY
const TEST_USER_KEY = process.env.TEST_PRIVATE_KEY

const PYUSD_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
]

async function main() {
  console.log('\n🎨 Minting PYUSD to Test User\n')
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const deployerWallet = new ethers.Wallet(DEPLOYER_KEY, provider)
  const testWallet = new ethers.Wallet(TEST_USER_KEY, provider)
  
  console.log(`📍 Deployer: ${deployerWallet.address}`)
  console.log(`📍 Test User: ${testWallet.address}`)
  console.log(`📍 PYUSD: ${PYUSD_ADDRESS}`)
  
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, PYUSD_ABI, deployerWallet)
  
  // Check balances before
  try {
    const balanceBefore = await pyusd.balanceOf(testWallet.address)
    console.log(`\n💵 Test User PYUSD Balance Before: ${ethers.formatUnits(balanceBefore, 6)} PYUSD`)
  } catch (error) {
    console.log(`⚠️ Could not read balance: ${error.message}`)
  }
  
  // Mint 10,000 PYUSD to test user
  const mintAmount = ethers.parseUnits("10000", 6)
  console.log(`\n🎨 Minting ${ethers.formatUnits(mintAmount, 6)} PYUSD to test user...`)
  
  try {
    const tx = await pyusd.mint(testWallet.address, mintAmount)
    console.log(`   Tx hash: ${tx.hash}`)
    console.log('   ⏳ Waiting for confirmation...')
    await tx.wait()
    console.log('   ✅ Minted!')
    
    const balanceAfter = await pyusd.balanceOf(testWallet.address)
    console.log(`\n💵 Test User PYUSD Balance After: ${ethers.formatUnits(balanceAfter, 6)} PYUSD`)
    console.log(`\n✅ Test user now has PYUSD for testing!\n`)
    
  } catch (error) {
    console.error('❌ Minting failed:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)
