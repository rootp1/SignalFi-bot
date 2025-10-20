import clearnode from './clearNode.js'
import { startAPI } from './api.js'

async function main() {
  console.log(' Starting SignalFi Relayer...')
  
  try {
    
    await clearnode.connect()
    
    
    startAPI()
    
    console.log(' Relayer initialized successfully')
  } catch (error) {
    console.error(' Failed to start relayer:', error)
    process.exit(1)
  }
}

main()