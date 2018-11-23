/* istanbul ignore file */
module.exports = logMemoryUsage

let lastMemory = {
  rss: 0,
  heapTotal: 0,
  heapUsed: 0,
  external: 0
}

/* istanbul ignore next */
function logMemoryUsage (app) {
  const interval = 10000 // 10s
  setInterval(() => {
    const usage = process.memoryUsage()
    const diff = usage.rss - lastMemory.rss
    app.log.info(usage, `Memory usage change: ${diff}`)
    lastMemory = usage
  }, interval) // 10s
}
