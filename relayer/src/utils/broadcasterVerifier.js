import { ethers } from 'ethers'
import config from '../config.js'

const BROADCASTER_REGISTRY_ABI = [
  "function broadcasters(address) view returns (bool isRegistered, bool isVerified, string name, uint256 feePercentage, uint256 followerCount, uint256 totalTrades, uint256 successfulTrades, int256 totalProfitLoss, uint256 registrationTime, uint256 lastTradeTime)"
]

let provider = null
let registryContract = null

/**
 * Initialize provider and contract
 */
export function initBroadcasterVerifier() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(config.l1.rpcUrl)
  }
  
  if (!registryContract && config.l1.broadcasterRegistry) {
    registryContract = new ethers.Contract(
      config.l1.broadcasterRegistry,
      BROADCASTER_REGISTRY_ABI,
      provider
    )
  }
}

/**
 * Verify broadcaster is registered on-chain
 * @param {string} broadcasterAddress - Address to verify
 * @returns {Promise<{isRegistered: boolean, isVerified: boolean, data: object}>}
 */
export async function verifyBroadcaster(broadcasterAddress) {
  try {
    initBroadcasterVerifier()
    
    if (!registryContract) {
      console.warn('⚠️ BroadcasterRegistry not configured, skipping verification')
      return { 
        isRegistered: true, // Allow if registry not configured
        isVerified: false,
        data: null
      }
    }
    
    const broadcaster = await registryContract.broadcasters(broadcasterAddress)
    
    return {
      isRegistered: broadcaster.isRegistered,
      isVerified: broadcaster.isVerified,
      data: {
        name: broadcaster.name,
        feePercentage: broadcaster.feePercentage.toString(),
        followerCount: broadcaster.followerCount.toString(),
        totalTrades: broadcaster.totalTrades.toString(),
        successfulTrades: broadcaster.successfulTrades.toString(),
        totalProfitLoss: broadcaster.totalProfitLoss.toString(),
        registrationTime: broadcaster.registrationTime.toString(),
        lastTradeTime: broadcaster.lastTradeTime.toString()
      }
    }
  } catch (error) {
    console.error('❌ Error verifying broadcaster:', error.message)
    // Fail open - allow trades if verification fails
    return {
      isRegistered: true,
      isVerified: false,
      data: null,
      error: error.message
    }
  }
}

/**
 * Verify broadcaster and throw if not registered
 */
export async function requireBroadcaster(broadcasterAddress) {
  const verification = await verifyBroadcaster(broadcasterAddress)
  
  if (!verification.isRegistered) {
    throw new Error(
      `Broadcaster ${broadcasterAddress} is not registered. Please register via BroadcasterRegistry contract.`
    )
  }
  
  return verification
}
