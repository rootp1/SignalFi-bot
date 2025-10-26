import clearnode from './clearnode.js'
import { startAPI } from './api.js'
import l1Listener from './l1Listener.js'
import { watchBroadcasterTrades } from './tradeExecutor.js'
async function main() {
  console.log('🚀 Starting SignalFi Relayer...')
  
  try {
    
    try {
      await clearnode.connect()
    } catch (cnError) {
      console.error('⚠️ ClearNode connection failed:', cnError.message)
      console.error('   Continuing startup without ClearNode — relayer will retry connecting in background.')
    }

    await l1Listener.initialize()
    l1Listener.startWatching()
    watchBroadcasterTrades();
    startAPI()
    
    console.log('✅ Relayer initialized successfully')
  } catch (error) {
    console.error('❌ Failed to start relayer:', error)
    process.exit(1)
  }
}

main()