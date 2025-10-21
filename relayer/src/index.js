import clearnode from './clearNode.js'
import { startAPI } from './api.js'
import l1Listener from './l1Listener.js'
async function main() {
  console.log('🚀 Starting SignalFi Relayer...')
  
  try {
    
    await clearnode.connect()
     await l1Listener.initialize()
    await l1Listener.watchDeposits()
    
    startAPI()
    
    console.log('✅ Relayer initialized successfully')
  } catch (error) {
    console.error('❌ Failed to start relayer:', error)
    process.exit(1)
  }
}

main()