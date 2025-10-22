export class Metrics {
  constructor() {
    this.data = {
      depositsProcessed: 0,
      channelsOpened: 0,
      tradesExecuted: 0,
      bundlesSubmitted: 0,
      averageBundleSize: 0,
      totalGasUsed: 0n,
      errors: 0
    }
  }

  increment(metric, value = 1) {
    this.data[metric] += value
  }

  addGasUsed(amount) {
    this.data.totalGasUsed += BigInt(amount)
  }

  getReport() {
    return {
      ...this.data,
      totalGasUsed: this.data.totalGasUsed.toString(),
      avgGasPerBundle: this.data.bundlesSubmitted > 0 
        ? (this.data.totalGasUsed / BigInt(this.data.bundlesSubmitted)).toString()
        : '0'
    }
  }
}
export const metrics = new Metrics()
