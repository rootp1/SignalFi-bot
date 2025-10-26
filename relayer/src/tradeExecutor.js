import nitrolite from '@erc7824/nitrolite';
const { createStateUpdateMessage } = nitrolite;
import clearnode from './clearnode.js';
import { 
  getSession, 
  updateSession, 
  updateUserBalance, 
  updateUserPnL,
  recordTrade 
} from './sessionManager.js';
import { createRelayerSigner } from './utils/signer.js'
import { submitBundleToL1 } from './l1submitter.js'
import config from './config.js'
import axios from 'axios'

// Remove in-memory followers map - will fetch from MongoDB via broadcaster-service

export async function registerFollower(userAddress, broadcasterAddress) {
  console.log(`👤 ${userAddress} following ${broadcasterAddress}`)
  
  // Registration happens via broadcaster-service and on-chain
  // This function mainly for updating local session state
  
  updateSession(userAddress, { 
    following: broadcasterAddress,
    followedAt: Date.now()
  })
  
  return { 
    success: true,
    message: `Now following ${broadcasterAddress}`,
    broadcasterFee: `${config.broadcasting.feePercent}% of profits`
  }
}

export async function unregisterFollower(userAddress, broadcasterAddress) {
  // Unregistration happens via broadcaster-service and on-chain
  // This just updates local session
  
  updateSession(userAddress, { 
    following: null,
    unfollowedAt: Date.now()
  })
  
  return { success: true, message: 'Unfollowed broadcaster' }
}

/**
 * Fetch followers from MongoDB via broadcaster-service API
 */
async function getFollowersFromMongoDB(broadcasterAddress) {
  try {
    const response = await axios.get(
      `${config.broadcasting.broadcasterServiceUrl || 'http://localhost:3002'}/followers/${broadcasterAddress}`
    )
    
    if (response.data && response.data.followers) {
      return response.data.followers
    }
    
    return []
  } catch (error) {
    console.error(`❌ Failed to fetch followers from MongoDB:`, error.message)
    return []
  }
}

export async function broadcastTrade(broadcasterAddress, trade, currentEthPrice) {
  console.log(`📡 Broadcasting ${trade.direction} from ${broadcasterAddress}`)
  
  // Step 1: Fetch followers from MongoDB
  const followerAddresses = await getFollowersFromMongoDB(broadcasterAddress)
  
  if (!followerAddresses || followerAddresses.length === 0) {
    console.log('ℹ️ No followers for this broadcaster')
    return { success: true, followersExecuted: 0 }
  }

  console.log(`👥 Found ${followerAddresses.length} followers from MongoDB`)
  
  // Step 2: Get broadcaster session and balance
  const broadcasterSession = getSession(broadcasterAddress)
  if (!broadcasterSession || broadcasterSession.status !== 'active') {
    throw new Error('Broadcaster does not have active Yellow session. Please deposit first.')
  }
  
  // Determine which balance to use based on trade direction
  const broadcasterBalance = trade.fromToken === 'pyusd' 
    ? broadcasterSession.positions.pyusd 
    : broadcasterSession.positions.eth
    
  if (!broadcasterBalance || BigInt(broadcasterBalance) === 0n) {
    throw new Error(`Broadcaster has zero ${trade.fromToken.toUpperCase()} balance`)
  }
  
  console.log(`💰 Broadcaster balance: ${broadcasterBalance} ${trade.fromToken.toUpperCase()}`)
  
  const tradeProposals = []
  const executedFollowers = []
  
  // Step 3: Create broadcaster trade (FULL BALANCE)
  tradeProposals.push({
    trader: broadcasterAddress,
    fromToken: trade.fromToken,
    toToken: trade.toToken,
    amount: broadcasterBalance, // FULL BALANCE!
    signature: '', // Will be signed by relayer
    isBroadcaster: true
  })
  
  console.log(`✅ Broadcaster will trade FULL balance: ${broadcasterBalance}`)

  // Step 4: Create follower trades (FULL BALANCES)
  for (const followerAddress of followerAddresses) {
    const session = getSession(followerAddress)
    
    if (!session || session.status !== 'active') {
      console.log(`⚠️ Skipping ${followerAddress}: inactive session`)
      continue
    }

    const followerTrade = await createFollowerTrade(
      followerAddress,
      trade,
      session,
      currentEthPrice
    )
    
    if (followerTrade) {
      tradeProposals.push(followerTrade);
      executedFollowers.push(followerAddress);
    }
  }

  console.log(`📦 Bundling ${tradeProposals.length} trades (1 broadcaster + ${executedFollowers.length} followers)...`)
  
  // Step 5: Update Yellow channel states FIRST (instant updates!)
  console.log(`⚡ Updating Yellow state channels instantly...`)
  await updateYellowChannelStates(
    [broadcasterAddress, ...executedFollowers],
    trade,
    currentEthPrice
  )
  
  // Step 6: Submit bundle to L1 for settlement
  const result = await submitBundleToL1(tradeProposals)
  
  // Step 7: Record trades after successful L1 settlement
  if (result.success) {
    for (const followerAddress of [broadcasterAddress, ...executedFollowers]) {
      recordTrade(followerAddress, {
        type: trade.type,
        direction: trade.direction,
        fromToken: trade.fromToken,
        toToken: trade.toToken,
        price: currentEthPrice,
        txHash: result.txHash
      })
    }
  }
  
  return {
    success: result.success,
    followersExecuted: executedFollowers.length,
    broadcasterExecuted: true,
    txHash: result.txHash,
    gasUsed: result.gasUsed
  }
}

/**
 * Update Yellow channel states BEFORE L1 submission for instant updates
 */
async function updateYellowChannelStates(addresses, trade, ethPrice) {
  for (const address of addresses) {
    const session = getSession(address)
    if (!session) continue
    
    const fromBalance = trade.fromToken === 'pyusd' 
      ? session.positions.pyusd 
      : session.positions.eth
    
    // Calculate how much they get
    let amountOut
    if (trade.type === 'buy') {
      // BUY: PYUSD → ETH
      amountOut = (BigInt(fromBalance) * BigInt(1e18)) / BigInt(Math.floor(ethPrice * 1e6))
      updateUserBalance(address, 'pyusd', fromBalance, 'subtract')
      updateUserBalance(address, 'eth', amountOut.toString(), 'add')
    } else {
      // SELL: ETH → PYUSD
      amountOut = (BigInt(fromBalance) * BigInt(Math.floor(ethPrice * 1e6))) / BigInt(1e18)
      updateUserBalance(address, 'eth', fromBalance, 'subtract')
      updateUserBalance(address, 'pyusd', amountOut.toString(), 'add')
    }
    
    // Update PnL
    updateUserPnL(address, ethPrice)
    
    console.log(`  ⚡ ${address}: ${fromBalance} ${trade.fromToken.toUpperCase()} → ${amountOut} ${trade.toToken.toUpperCase()}`)
  }
}

async function createFollowerTrade(followerAddress, broadcasterTrade, session, ethPrice) {
  try {
    // Get follower's balance for the source token
    const followerBalance = broadcasterTrade.fromToken === 'pyusd'
      ? session.positions.pyusd || '0'
      : session.positions.eth || '0'
    
    // Check minimum balance (1 PYUSD or equivalent ETH)
    const minBalance = broadcasterTrade.fromToken === 'pyusd' ? '1000000' : '333333333333333' // ~$1 worth
    
    if (BigInt(followerBalance) < BigInt(minBalance)) {
      console.log(`⚠️ ${followerAddress} has insufficient ${broadcasterTrade.fromToken.toUpperCase()} balance`)
      console.log(`   Available: ${followerBalance}, Minimum: ${minBalance}`)
      return null
    }

    console.log(`  ✅ ${followerAddress} will trade FULL balance: ${followerBalance} ${broadcasterTrade.fromToken.toUpperCase()}`)

    // Create trade proposal with FULL balance
    return {
      trader: followerAddress,
      fromToken: broadcasterTrade.fromToken,
      toToken: broadcasterTrade.toToken,
      amount: followerBalance, // FULL BALANCE!
      signature: '', // Will be signed by relayer
      isBroadcaster: false
    };
  } catch (error) {
    console.error(`❌ Error creating follower trade for ${followerAddress}:`, error);
    return null
  }
}

export function calculateBroadcasterFee(followerAddress, profit) {
  const session = getSession(followerAddress)
  if (!session || !session.following) return '0'
  
  const feePercent = config.broadcasting.feePercent;
  const fee = (BigInt(profit) * BigInt(feePercent)) / BigInt(100)
  
  const currentFees = BigInt(session.fees.owed || '0')
  updateSession(followerAddress, {
    fees: {
      ...session.fees,
      owed: (currentFees + fee).toString()
    }
  })
  
  console.log(`💰 Broadcaster fee calculated: ${fee.toString()} PYUSD (${feePercent}% of ${profit})`)
  
  return fee.toString()
}

export function watchBroadcasterTrades() {
  console.log('👀 Watching for broadcaster trades via /broadcast-trade API endpoint...')
}

export async function getFollowerCount(broadcasterAddress) {
  const followers = await getFollowersFromMongoDB(broadcasterAddress)
  return followers.length
}

export async function getFollowers(broadcasterAddress) {
  return await getFollowersFromMongoDB(broadcasterAddress)
}
