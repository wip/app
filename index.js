module.exports = wip

const sendLogs = require('./lib/logs/send')
const handlePullRequestChange = require('./lib/handle-pull-request-change')
const handleRequestedAction = require('./lib/handle-requested-action')

function wip (app) {
  // listen to all relevant pull request event actions
  app.on([
    'pull_request.opened',
    'pull_request.edited',
    'pull_request.labeled',
    'pull_request.unlabeled',
    'pull_request.synchronize'
  ], handlePullRequestChange.bind(null, app))

  // listen to an overwrite request action from a check run
  app.on('check_run.requested_action', handleRequestedAction.bind(null, app))

  sendLogs(app)
}
