import WebSocket from 'ws'
import nitrolite from '@erc7824/nitrolite';
const { parseAnyRPCResponse } = nitrolite;
import config from './config.js';

class ClearNodeConnection {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to ClearNode...')
      
      this.ws = new WebSocket(config.clearnode.endpoint)
      
      this.ws.on('open', () => {
        console.log('✅ Connected to Yellow ClearNode')
        this.connected = true
        this.reconnectAttempts = 0
        resolve()
      })

      this.ws.on('message', (data) => {
        this.handleMessage(data)
      })

      this.ws.on('error', (error) => {
        console.error('❌ ClearNode error:', error)
        reject(error)
      })

      this.ws.on('close', () => {
        console.log('⚠️ Disconnected from ClearNode')
        this.connected = false
        this.attemptReconnect()
      })
    })
  }

  handleMessage(data) {
    try {
      const message = parseAnyRPCResponse(data.toString())
      console.log(' Received from ClearNode:', message)

      
      if (message.type && this.messageHandlers.has(message.type)) {
        this.messageHandlers.get(message.type)(message)
      }
    } catch (error) {
      console.error('Error parsing message:', error)
    }
  }

  onMessage(type, handler) {
    this.messageHandlers.set(type, handler)
  }

  send(message) {
    if (!this.connected) {
      throw new Error('Not connected to ClearNode')
    }
    this.ws.send(message)
  }

  attemptReconnect() {
    if (this.reconnectAttempts < config.clearnode.retryAttempts) {
      this.reconnectAttempts++
      console.log(` Reconnecting... Attempt ${this.reconnectAttempts}`)
      setTimeout(() => {
        this.connect().catch(err => {
          console.error('Reconnect attempt failed:', err?.message || err)
          // schedule another attempt
          this.attemptReconnect()
        })
      }, 5000)
    } else {
      console.error(' Max reconnection attempts reached')
    }
  }
}

export default new ClearNodeConnection()
