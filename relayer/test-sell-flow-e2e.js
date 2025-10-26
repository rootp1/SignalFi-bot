/**
 * End-to-End SELL Flow Test
 * Tests selling ETH back to PYUSD
 */

import { ethers } from 'ethers'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

// Test accounts (same as BUY test - they should have ETH now)
const BROADCASTER_ADDRESS = '0xF53EC3ea43AbF6fdD0CD9Eb02111cA03e65c0345'
const SUBSCRIBER_ADDRESS = '0xE723131DE401C572e94621165403d0335c2327bB'

// Config
const RELAYER_URL = 'http://localhost:3000'

async function main() {
  console.log('\n🎯 END-TO-END SELL FLOW TEST\n')
  console.log('═══════════════════════════════════════')
  console.log(`📡 Broadcaster: ${BROADCASTER_ADDRESS}`)
  console.log(`📡 Subscriber:  ${SUBSCRIBER_ADDRESS}`)
  console.log('═══════════════════════════════════════\n')
  
  // Check current balances (should have ETH from previous BUY test)
  console.log('📊 STEP 1/2: Checking current balances...')
  
  const broadcasterSession = await axios.get(`${RELAYER_URL}/balance/${BROADCASTER_ADDRESS}`)
  const subscriberSession = await axios.get(`${RELAYER_URL}/balance/${SUBSCRIBER_ADDRESS}`)
  
  console.log(`   Broadcaster:`)
  console.log(`      PYUSD: ${ethers.formatUnits(broadcasterSession.data.balance.pyusd, 6)}`)
  console.log(`      ETH:   ${ethers.formatUnits(broadcasterSession.data.balance.eth, 18)}`)
  
  console.log(`   Subscriber:`)
  console.log(`      PYUSD: ${ethers.formatUnits(subscriberSession.data.balance.pyusd, 6)}`)
  console.log(`      ETH:   ${ethers.formatUnits(subscriberSession.data.balance.eth, 18)}`)
  
  if (broadcasterSession.data.balance.eth === '0' || subscriberSession.data.balance.eth === '0') {
    throw new Error('❌ Accounts have no ETH to sell! Run BUY test first.')
  }
  
  console.log('   ✅ Both have ETH to sell\n')
  
  // Execute SELL signal
  console.log('🎯 STEP 2/2: Broadcasting SELL ETH signal...')
  
  try {
    const sellResponse = await axios.post(`${RELAYER_URL}/broadcast-trade`, {
      broadcasterAddress: BROADCASTER_ADDRESS,
      direction: 'SELL_ETH',
      ethPrice: 3000
    })
    
    console.log('   ✅ SELL signal processed!')
    console.log(`   📊 Response:`, sellResponse.data)
    
    // Wait for L1 settlement
    console.log('\n   ⏳ Waiting 5 seconds for L1 settlement...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Check final balances
    console.log('\n📊 Final Yellow State:')
    const finalBroadcaster = await axios.get(`${RELAYER_URL}/balance/${BROADCASTER_ADDRESS}`)
    const finalSubscriber = await axios.get(`${RELAYER_URL}/balance/${SUBSCRIBER_ADDRESS}`)
    
    console.log(`\n   Broadcaster:`)
    console.log(`      PYUSD: ${ethers.formatUnits(finalBroadcaster.data.balance.pyusd, 6)}`)
    console.log(`      ETH:   ${ethers.formatUnits(finalBroadcaster.data.balance.eth, 18)}`)
    
    console.log(`\n   Subscriber:`)
    console.log(`      PYUSD: ${ethers.formatUnits(finalSubscriber.data.balance.pyusd, 6)}`)
    console.log(`      ETH:   ${ethers.formatUnits(finalSubscriber.data.balance.eth, 18)}`)
    
    // Verify they got PYUSD back
    if (finalBroadcaster.data.balance.pyusd === '0' || finalSubscriber.data.balance.pyusd === '0') {
      throw new Error('❌ SELL failed - no PYUSD received!')
    }
    
    if (finalBroadcaster.data.balance.eth !== '0' || finalSubscriber.data.balance.eth !== '0') {
      throw new Error('❌ SELL failed - still have ETH!')
    }
    
    console.log('\n   ✅ All ETH sold for PYUSD!')
    
  } catch (error) {
    console.error('\n   ❌ SELL signal failed:', error.response?.data || error.message)
    throw error
  }
  
  console.log('\n═══════════════════════════════════════')
  console.log('✅ SELL FLOW TEST COMPLETE!')
  console.log('═══════════════════════════════════════\n')
}

main().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
