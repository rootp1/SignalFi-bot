import express from 'express'
import config from './config.js'

const app = express()
app.use(express.json())
const userBalances = new Map()
app.get('/balance/:address', (req, res) => {
  const { address } = req.params
  const balance = userBalances.get(address.toLowerCase()) || {
    usdc: '0',
    sol: '0'
  }
  res.json({ success: true, balance })
})
app.post('/follow', (req, res) => {
  const { userAddress, broadcasterAddress } = req.body
  res.json({ success: true, message: 'Follow functionality coming soon' });
})
export function startAPI() {
  app.listen(config.api.port, () => {
    console.log(`🚀 API server running on port ${config.api.port}`);
  })
}

export { app, userBalances }