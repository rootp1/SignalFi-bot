/**
 * Claim PYUSD from faucet for testing
 */

import { ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

const RPC_URL = process.env.L1_RPC_URL
const PYUSD_ADDRESS = process.env.PYUSD_TOKEN_ADDRESS
const FAUCET_ADDRESS = "0x5B5D3eB216B3DDF6d0EC24f1184B263B9C4eB1aa" // From deployment-info.json
const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY

const FAUCET_ABI = [
  "function claimPYUSD() external",
  "event PYUSDClaimed(address indexed claimer, uint256 amount, uint256 timestamp)"
]

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
]

async function main() {
  console.log('\n💰 Claiming PYUSD from Faucet\n')
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
  const userAddress = wallet.address
  
  console.log(`📍 User Address: ${userAddress}`)
  console.log(`📍 PYUSD: ${PYUSD_ADDRESS}`)
  console.log(`📍 Faucet: ${FAUCET_ADDRESS}`)
  
  // Check balance before
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, ERC20_ABI, wallet)
  
  try {
    const balanceBefore = await pyusd.balanceOf(userAddress)
    console.log(`\n💵 PYUSD Balance Before: ${ethers.formatUnits(balanceBefore, 6)} PYUSD`)
  } catch (error) {
    console.log(`⚠️ Could not read balance (contract may not exist): ${error.message}`)
    console.log('\n💡 Trying to mint PYUSD directly...\n')
    
    // Try minting if we're the owner
    const PYUSD_WITH_MINT_ABI = [
      "function mint(address to, uint256 amount) external",
      "function balanceOf(address account) view returns (uint256)"
    ]
    
    const pyusdMintable = new ethers.Contract(PYUSD_ADDRESS, PYUSD_WITH_MINT_ABI, wallet)
    
    try {
      const mintAmount = ethers.parseUnits("1000", 6) // Mint 1000 PYUSD
      console.log(`🎨 Minting ${ethers.formatUnits(mintAmount, 6)} PYUSD to ${userAddress}...`)
      const mintTx = await pyusdMintable.mint(userAddress, mintAmount)
      console.log(`   Tx hash: ${mintTx.hash}`)
      await mintTx.wait()
      console.log('   ✅ Minted!')
      
      const balanceAfter = await pyusdMintable.balanceOf(userAddress)
      console.log(`\n✅ New PYUSD Balance: ${ethers.formatUnits(balanceAfter, 6)} PYUSD\n`)
      return
    } catch (mintError) {
      console.log(`❌ Minting failed: ${mintError.message}`)
      console.log('\nPlease deploy contracts or check PYUSD address\n')
      process.exit(1)
    }
  }
  
  // Claim from faucet
  const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, wallet)
  
  try {
    console.log('\n🚰 Claiming from faucet...')
    const tx = await faucet.claimPYUSD()
    console.log(`   Tx hash: ${tx.hash}`)
    console.log('   ⏳ Waiting for confirmation...')
    await tx.wait()
    console.log('   ✅ Claimed!')
    
    const balanceAfter = await pyusd.balanceOf(userAddress)
    console.log(`\n💵 PYUSD Balance After: ${ethers.formatUnits(balanceAfter, 6)} PYUSD`)
    console.log(`📈 Received: ${ethers.formatUnits(balanceAfter - balanceBefore, 6)} PYUSD\n`)
    
  } catch (error) {
    console.error('❌ Claim failed:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)
