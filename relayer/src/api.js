import express from 'express'
import config from './config.js'
import l1Listener from './l1Listener.js'
import { getSession, updateUserPnL } from './sessionManager.js'
import { 
  broadcastTrade, 
  registerFollower, 
  unregisterFollower,
  getFollowerCount,
  getFollowers 
} from './tradeExecutor.js'
import clearnode from './clearNode.js'
import { checkUserDeposit } from './l1submitter.js'

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body || '')
  next()
})
app.get('/health', (req, res) => {
  try {
    res.json({
      status: 'ok',
      service: 'PyUSDCopyBot Relayer',
      version: '1.0.0',
      clearnode: clearnode.connected ? 'connected' : 'disconnected',
      arcology: 'connected', 
      uptime: process.uptime(),
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    })
  }
})

app.get('/balance/:address', async (req, res) => {
  const { address } = req.params
  const { ethPrice } = req.query
  
  try {
    const session = getSession(address)
    
    if (!session) {
     
      const l1Balance = await checkUserDeposit(address)
      
      return res.json({
        success: true,
        user: address,
        balance: {
          pyusd: l1Balance,
          eth: '0'
        },
        portfolio: {
          totalValue: l1Balance,
          pnl: {
            realized: '0',
            unrealized: '0',
            total: '0'
          }
        },
        source: 'l1',
        message: 'Deposit detected. Yellow channel pending...'
      })
    }
    if (ethPrice && !isNaN(parseFloat(ethPrice))) {
      updateUserPnL(address, parseFloat(ethPrice))
    }

    const pyusdBalance = BigInt(session.positions.pyusd || '0')
    const ethBalance = BigInt(session.positions.eth || '0')
    const ethPriceInPyusd = ethPrice ? parseFloat(ethPrice) : 3000
    const ethValueInPyusd = (ethBalance * BigInt(Math.floor(ethPriceInPyusd * 1e6))) / BigInt(1e18)
    const totalValue = pyusdBalance + ethValueInPyusd

    res.json({
      success: true,
      user: address,
      balance: {
        pyusd: session.positions.pyusd,
        eth: session.positions.eth
      },
      portfolio: {
        totalValue: totalValue.toString(),
        pnl: session.pnl,
        fees: session.fees
      },
      following: session.following || null,
      sessionStatus: session.status,
      source: 'yellow',
      tradeCount: session.trades.length,
      lastUpdated: new Date(session.lastUpdated).toISOString()
    })
    
  } catch (error) {
    console.error('Balance check error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

app.get('/trades/:address', async (req, res) => {
  const { address } = req.params
  const { limit = 50 } = req.query

  
  try {
    const session = getSession(address)
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'User session not found'
      })
    }

    const trades = session.trades.slice(-parseInt(limit))

    res.json({
      success: true,
      user: address,
      trades: trades,
      totalTrades: session.trades.length
    })
    
  } catch (error) {
    console.error('Trade history error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})
app.post('/follow', async (req, res) => {
  const { userAddress, broadcasterAddress } = req.body;
  
  try {
    if (!userAddress || !broadcasterAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userAddress or broadcasterAddress' 
      })
    }

    const session = getSession(userAddress)
    if (!session || session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'User must deposit and activate session first'
      })
    }

    const result = await registerFollower(userAddress, broadcasterAddress);
    res.json(result)
    
  } catch (error) {
    console.error('Follow registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})
app.post('/unfollow', async (req, res) => {
  const { userAddress, broadcasterAddress } = req.body;
  
  try {
    if (!userAddress || !broadcasterAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userAddress or broadcasterAddress' 
      })
    }

    const result = await unregisterFollower(userAddress, broadcasterAddress);
    res.json(result)
    
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})
app.post('/broadcast-trade', async (req, res) => {
  const { broadcasterAddress, trade, ethPrice } = req.body
  
  try {
    
    if (!broadcasterAddress || !trade) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing broadcasterAddress or trade data' 
      })
    }

    if (!trade.fromToken || !trade.toToken || !trade.amount || !trade.signature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade structure. Required: fromToken, toToken, amount, signature'
      })
    }

   
    if (!trade.type || !['buy', 'sell'].includes(trade.type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade type. Must be "buy" or "sell"'
      })
    }

    const currentEthPrice = ethPrice || 3000
    
    console.log(`📊 Processing ${trade.type.toUpperCase()} signal from ${broadcasterAddress}`)
    console.log(`💱 Current ETH price: ${currentEthPrice}`)
    
    const result = await broadcastTrade(broadcasterAddress, trade, currentEthPrice)
    
    res.json({
      ...result,
      broadcasterAddress,
      tradeType: trade.type,
      ethPrice: currentEthPrice
    })
    
  } catch (error) {
    console.error('Broadcast trade error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

app.get('/broadcaster/:address', async (req, res) => {
  const { address } = req.params;
  
  try {
    const followerCount = getFollowerCount(address)
    const followerList = getFollowers(address)
    

    let totalVolume = 0n
    let totalPnL = 0n
    let activeSessions = 0
    
    for (const followerAddress of followerList) {
      const session = getSession(followerAddress)
      if (session && session.status === 'active') {
        activeSessions++;
        totalPnL += BigInt(session.pnl.total || '0')
      }
    }

    res.json({
      success: true,
      broadcaster: address,
      stats: {
        followerCount,
        activeFollowers: activeSessions,
        totalPnL: totalPnL.toString(),
        feeRate: `${config.broadcasting.feePercent}%`,
        followers: followerList
      }
    })
    
  } catch (error) {
    console.error('Broadcaster stats error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

app.get('/metrics', (req, res) => {
  try {

    const allSessions = Array.from(require('./sessionManager.js').userSessions || new Map())
    
    const metrics = {
      totalUsers: allSessions.length,
      activeSessions: allSessions.filter(([_, s]) => s.status === 'active').length,
      totalTrades: allSessions.reduce((sum, [_, s]) => sum + s.trades.length, 0),
      totalVolume: allSessions.reduce((sum, [_, s]) => {
        const pyusd = BigInt(s.positions?.pyusd || '0')
        const eth = BigInt(s.positions?.eth || '0')
        return sum + pyusd + eth
      }, 0n).toString(),
      clearnode: {
        status: clearnode.connected ? 'connected' : 'disconnected',
        endpoint: config.clearnode.endpoint
      },
      arcology: {
        network: 'Arcology DevNet',
        chainId: config.l1.chainId,
        rpc: config.l1.rpcUrl
      },
      fees: config.fees,
      uptime: Math.floor(process.uptime()),
      timestamp: Date.now()
    }

    res.json({
      success: true,
      metrics
    })
    
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})
app.get('/fees', (req, res) => {
  res.json({
    success: true,
    fees: {
      deposit: `${config.fees.deposit} PYUSD`,
      withdrawal: `${config.fees.withdrawal} PYUSD`,
      trade: `${config.fees.trade} PYUSD`,
      broadcasterShare: `${config.broadcasting.feePercent}% of profits`
    },
    currency: 'PYUSD (PayPal USD)'
  })
})
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  })
})
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /balance/:address',
      'GET /trades/:address',
      'GET /broadcaster/:address',
      'GET /metrics',
      'GET /fees',
      'POST /follow',
      'POST /unfollow',
      'POST /broadcast-trade'
    ]
  })
})

export function startAPI() {
  app.listen(config.api.port, config.api.host, () => {
    console.log(`🚀 PyUSDCopyBot API server running`);
    console.log(`   URL: http://${config.api.host}:${config.api.port}`)
    console.log(`   Health: http://localhost:${config.api.port}/health`)
    console.log(`   Docs: http://localhost:${config.api.port}/`)
  })
}

export { app }