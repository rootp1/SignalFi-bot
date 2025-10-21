import express from 'express'
import config from './config.js'
import l1Listener from './l1Listener.js'
import { broadcastTrade, registerFollower } from './tradeExecutor.js'
import { getSession } from './sessionManager.js'
import { metrics } from './utils/metrics.js'
const app = express()
app.use(express.json())
app.get('/balance/:address', async (req, res) => {
  const { address } = req.params
  try {
    const session = getSession(address)
    if (!session) {
      const l1Balance = await l1Listener.getUserDeposit(address);
      return res.json({
        success: true,
        balance: { usdc: l1Balance.toString(), sol: '0' },
        source: 'l1'
      })
    }
    const userAllocation = session.allocations.find(
      a => a.participant.toLowerCase() === address.toLowerCase()
    )
res.json({
      success: true,
      balance: {
        usdc: userAllocation?.amount || '0',
        sol: '0' 
      },
      source: 'l2',
      sessionStatus: session.status
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
app.post('/follow', async (req, res) => {
  const { userAddress, broadcasterAddress } = req.body
  try {
    const result = await registerFollower(userAddress, broadcasterAddress)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
app.post('/broadcast-trade', async (req, res) => {
  const { broadcasterAddress, trade } = req.body
  try {
    await broadcastTrade(broadcasterAddress, trade)
    res.json({ success: true, message: 'Trade broadcasted' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    clearnode: clearnode.connected ? 'connected' : 'disconnected',
    l1: 'connected', 
uptime: process.uptime()
  })
})
app.get('/metrics', (req, res) => {
  res.json(metrics.getReport())
  
})
export function startAPI() {
  app.listen(config.api.port, () => {
    console.log(`🚀 API server running on port ${config.api.port}`)
  })
}
export { app }
