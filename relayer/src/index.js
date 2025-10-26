import clearnode from './clearNode.js'
import l1Listener from './l1Listener.js'
import { startAPI } from './api.js'
import { watchBroadcasterTrades } from './tradeExecutor.js'

async function main() {
  console.log('🚀 Starting PyUSDCopyBot Relayer...')
  
  try {
    
    await clearnode.connect()
    
    await l1Listener.initialize()
    await l1Listener.watchDeposits()
    
    
    watchBroadcasterTrades()
    
    
    startAPI()
    
    console.log('')
    console.log('✅ Relayer initialized successfully')
    console.log('📊 Ready to process deposits and trades')
    console.log('')
    
  } catch (error) {
    console.error('❌ Failed to start relayer:', error)
    console.error('')
    console.error('💡 Check:')
    console.error('   - RPC URL is accessible')
    console.error('   - Contract addresses are correct')
    console.error('   - Network connection is stable')
    process.exit(1)
  }
}

main()
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...')
  l1Listener.stopWatching()
  process.exit(0)
})