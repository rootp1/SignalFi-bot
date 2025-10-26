import { ethers } from 'ethers'
import config from './config.js'
import { createRelayerSigner } from './utils/signer.js'

const PARALLEL_BATCH_EXECUTOR_ABI = [
  "function executeBatchBuy(address[] calldata users, uint256[] calldata amounts) external returns (uint256)",
  "function executeBatchSell(address[] calldata users, uint256[] calldata amounts) external returns (uint256)",
  "event BatchExecuted(uint256 indexed batchId, uint256 userCount, uint256 totalAmountIn, uint256 totalAmountOut, uint256 timestamp)",
  "event TradeExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)"
]

export async function submitBundleToL1(tradeProposals) {
  console.log(`📤 Submitting bundle of ${tradeProposals.length} trades to L1...`)
  
  try {
    const signer = new ethers.Wallet(
      config.l1.relayerPrivateKey,
      new ethers.JsonRpcProvider(config.l1.rpcUrl)
    )
 
    const batchExecutor = new ethers.Contract(
      config.l1.parallelBatchExecutor,
      PARALLEL_BATCH_EXECUTOR_ABI,
      signer
    )

    // Determine if this is a BUY or SELL based on the first trade
    const isBuy = tradeProposals[0].direction === 'BUY_ETH'
    
    // Extract user addresses and amounts
    const users = tradeProposals.map(trade => trade.trader)
    const amounts = tradeProposals.map(trade => trade.amount)
    
    console.log(`📝 Calling ${isBuy ? 'executeBatchBuy' : 'executeBatchSell'}() on ParallelBatchExecutor...`)
    console.log(`� Users: ${users.length}`)
    console.log(`💰 Total amount: ${amounts.reduce((a, b) => BigInt(a) + BigInt(b), 0n).toString()}`)
    
    // Call the appropriate batch function
    const tx = isBuy 
      ? await batchExecutor.executeBatchBuy(users, amounts)
      : await batchExecutor.executeBatchSell(users, amounts)
    
    console.log(`⏳ Transaction sent: ${tx.hash}`)
    console.log(`🔗 View on explorer: https://testnet-explorer.arcology.network/tx/${tx.hash}`)
    
    const receipt = await tx.wait()
    
    const gasUsed = receipt.gasUsed.toString()
    const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice || 0n
    const costInGwei = (BigInt(gasUsed) * BigInt(gasPrice)) / BigInt(1e9)
    
    console.log(`✅ Bundle settled successfully!`)
    console.log(`   Gas used: ${gasUsed}`)
    console.log(`   Cost: ${costInGwei.toString()} gwei`)
    
    return {
      success: true,
      txHash: receipt.hash,
      gasUsed: gasUsed,
      tradeCount: tradeProposals.length
    }
    
  } catch (error) {
    console.error('❌ Failed to submit bundle to L1:', error)
   
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('💸 Relayer wallet has insufficient funds for gas!')
    } else if (error.code === 'NONCE_EXPIRED') {
      console.error('🔄 Nonce issue - transaction may have been replaced')
    } else if (error.message.includes('revert')) {
      console.error('⛔ Transaction reverted - check contract logic')
    }
    
    throw error
  }
}

export async function checkUserDeposit(userAddress) {
  try {
    const provider = new ethers.JsonRpcProvider(config.l1.rpcUrl)
    const vaultContract = new ethers.Contract(
      config.l1.pyusdVault,
      PYUSD_VAULT_ABI,
      provider
    )
    
    const depositAmount = await vaultContract.deposits(userAddress)
    return depositAmount.toString()
  } catch (error) {
    console.error('Error checking deposit:', error)
    return '0'
  }
}
