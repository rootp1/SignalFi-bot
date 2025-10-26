/**
 * Mint PYUSD to test accounts
 */

import { ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

const BROADCASTER_ADDRESS = '0x2c75F260ec3532c722C034835fa292b937Fe2FEE' // From private key 0x83e68ebb...
const SUBSCRIBER_ADDRESS = '0xE723131DE401C572e94621165403d0335c2327bB' // From private key 0x11349b98...

const RPC_URL = process.env.L1_RPC_URL
const PYUSD_ADDRESS = process.env.PYUSD_TOKEN_ADDRESS
const DEPLOYER_KEY = process.env.RELAYER_PRIVATE_KEY

const ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)"
]

async function main() {
  console.log('\n💵 Minting PYUSD for Test Accounts\n')
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const deployerWallet = new ethers.Wallet(DEPLOYER_KEY, provider)
  
  console.log(`📍 Deployer: ${deployerWallet.address}`)
  console.log(`📍 PYUSD: ${PYUSD_ADDRESS}\n`)
  
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, ERC20_ABI, deployerWallet)
  
  // Mint 1000 PYUSD to broadcaster
  console.log('Minting 1000 PYUSD to Broadcaster...')
  const broadcasterAmount = ethers.parseUnits('1000', 6)
  const tx1 = await pyusd.mint(BROADCASTER_ADDRESS, broadcasterAmount)
  await tx1.wait()
  console.log(`✅ Minted to ${BROADCASTER_ADDRESS}`)
  console.log(`   Tx: ${tx1.hash.slice(0, 10)}...\n`)
  
  // Mint 1000 PYUSD to subscriber
  console.log('Minting 1000 PYUSD to Subscriber...')
  const subscriberAmount = ethers.parseUnits('1000', 6)
  const tx2 = await pyusd.mint(SUBSCRIBER_ADDRESS, subscriberAmount)
  await tx2.wait()
  console.log(`✅ Minted to ${SUBSCRIBER_ADDRESS}`)
  console.log(`   Tx: ${tx2.hash.slice(0, 10)}...\n`)
  
  console.log('✅ Minting complete!\n')
}

main().catch(error => {
  console.error('❌ Minting failed:', error)
  process.exit(1)
})
