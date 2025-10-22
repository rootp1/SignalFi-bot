import { ethers } from 'ethers'
import config from './config.js'
import { createRelayerSigner } from './utils/signer.js'

const SETTLEMENT_ABI = [
  "function settleTrades(bytes[] calldata bundledAgreements) external",
  "function getTradeResult(bytes32 tradeId) view returns (uint256)"
]

export async function submitBundleToL1(tradeProposals) {
  console.log(`📤 Submitting bundle of ${tradeProposals.length} trades to L1...`)
    try {
    const signer = new ethers.Wallet(
      config.l1.relayerPrivateKey,
      new ethers.JsonRpcProvider(config.l1.rpcUrl)
    )
    const settlementContract = new ethers.Contract(
      config.l1.settlementContract,
      SETTLEMENT_ABI,
      signer
    )
    const encodedTrades = tradeProposals.map(trade => {
      return ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'address', 'uint256', 'bytes'],
        [
          trade.trader,
          trade.fromToken,
          trade.toToken,
          trade.amount,
          trade.signature
        ]
      )
    })
console.log('📝 Calling settleTrades()...')
        const tx = await settlementContract.settleTrades(encodedTrades)
    
    console.log(`⏳ Transaction sent: ${tx.hash}`)
    
    const receipt = await tx.wait()
    
    console.log(`✅ Bundle settled! Gas used: ${receipt.gasUsed.toString()}`)
    
    return {
      success: true,
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString()
    }
  } catch (error) {
    console.error('❌ Failed to submit bundle:', error)
    throw error
  }
}

