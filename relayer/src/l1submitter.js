import { ethers } from 'ethers'
import config from './config.js'
import { createRelayerSigner } from './utils/signer.js'

const PARALLEL_BATCH_EXECUTOR_ABI = [
  "function executeBatch(bytes[] calldata bundledTrades) external returns (bool)",
  "function getExecutionResult(bytes32 batchId) view returns (uint256[] memory)",
  "event BatchExecuted(bytes32 indexed batchId, uint256 tradeCount, uint256 gasUsed)"
]
const PYUSD_VAULT_ABI = [
  "function deposits(address user) view returns (uint256)",
  "function withdraw(uint256 amount) external",
  "event Deposit(address indexed user, uint256 amount, uint256 timestamp)",
  "event Withdrawal(address indexed user, uint256 amount, uint256 timestamp)"
]

export async function submitBundleToL1(tradeProposals) {
  console.log(`📤 Submitting bundle of ${tradeProposals.length} trades to L1...`)
    try {
    const signer = new ethers.Wallet(
      config.l1.relayerPrivateKey,
      new ethers.JsonRpcProvider(config.l1.rpcUrl)
    )
 
    const batchExecutor = new ethers.Contract(
      config.l1.simpleAMM, 
      PARALLEL_BATCH_EXECUTOR_ABI,
      signer
    )

 
    const encodedTrades = tradeProposals.map(trade => {
      return ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'address', 'uint256', 'bytes', 'bool'],
        [
          trade.trader,
          trade.fromToken === 'pyusd' ? config.l1.pyusd : config.l1.eth,
          trade.toToken === 'eth' ? config.l1.eth : config.l1.pyusd,
          trade.amount,
          trade.signature,
          trade.isBroadcaster || false
        ]
      )
    })

    console.log('📝 Calling executeBatch() on ParallelBatchExecutor...')
    console.log(`💰 Estimated cost: $${config.fees.trade} per user`)
    
 
    let gasLimit
    try {
      const gasEstimate = await batchExecutor.executeBatch.estimateGas(encodedTrades)
      gasLimit = gasEstimate * 120n / 100n
      console.log(`⛽ Gas estimate: ${gasEstimate.toString()} (limit: ${gasLimit.toString()})`)
    } catch (error) {
      console.warn('⚠️ Gas estimation failed, using default:', error.message)
      gasLimit = 20000000n
    }
  
    const tx = await batchExecutor.executeBatch(encodedTrades, {
      gasLimit: gasLimit
    })
    
    console.log(`⏳ Transaction sent: ${tx.hash}`)
    console.log(`🔗 View on explorer: https://testnet-explorer.arcology.network/tx/${tx.hash}`);
    
    const receipt = await tx.wait();
    
    const gasUsed = receipt.gasUsed.toString();
    const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice || 0n
    const costInGwei = (BigInt(gasUsed) * BigInt(gasPrice)) / BigInt(1e9)
    
    console.log(`✅ Bundle settled successfully!`)
    console.log(`   Gas used: ${gasUsed}`)
    console.log(`   Cost: ${costInGwei.toString()} gwei`)
    console.log(`   Per user: ~$${config.fees.trade}`)
    
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
