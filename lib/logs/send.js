module.exports = sendLogs

const LogDNAStream = require('logdna-bunyan').BunyanStream

/* istanbul ignore next */
function sendLogs (app) {
  const key = process.env.LOGDNA_API_KEY

  if (!key) {
    return
  }

  app.log.target.addStream({
    type: 'raw',
    stream: new LogDNAStream({ key })
  })
}
