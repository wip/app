module.exports = probotPlugin

const sendLogs = require('./lib/send-logs')
const handlePullRequestChange = require('./lib/handle-pull-request-change')

function probotPlugin (robot) {
  robot.on([
    'pull_request.opened',
    'pull_request.edited',
    'pull_request.labeled',
    'pull_request.unlabeled',
    'pull_request.synchronize'
  ], handlePullRequestChange)

  sendLogs(robot)
}
