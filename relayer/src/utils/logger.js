export const logger = {
  info: (msg, data) => {
    console.log(`ℹ️  [INFO] ${msg}`, data || '')
  },
    success: (msg, data) => {
    console.log(`✅ [SUCCESS] ${msg}`, data || '')
  },
  error: (msg, error) => {
    console.error(`❌ [ERROR] ${msg}`, error)
  },
  warn: (msg, data) => {
    console.warn(`⚠️  [WARN] ${msg}`, data || '')
  },
   trade: (msg, data) => {
    console.log(`📊 [TRADE] ${msg}`, data || '')
  }
}
