import express from 'express'
import config from './config.js'
import l1Listener from './l1Listener.js'
import { getSession } from './sessionManager.js'
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
        sol: '0' // Will track after trades
      },
      source: 'l2',
      sessionStatus: session.status
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
})
export function startAPI() {
  app.listen(config.api.port, () => {
    console.log(`🚀 API server running on port ${config.api.port}`);
  })
}
export { app }
