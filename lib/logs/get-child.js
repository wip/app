module.exports = getChildLog

const getConfig = require('../app-config')

function getChildLog ({ context, action, plan, newStatus, repo, hasChange, shortUrl }) {
  const log = context.log.child({
    name: getConfig().name,
    event: context.event,
    action,
    account: repo.owner.id,
    plan,
    repo: repo.id,
    private: repo.private,
    change: hasChange,
    override: newStatus.override,
    wip: newStatus.wip,
    location: newStatus.location,
    match: newStatus.match
  })

  return {
    noUpdate () {
      log.info(`😐 ${shortUrl}`)
    },
    stateChanged () {
      const logStatus = newStatus.override ? '❗️' : newStatus.wip ? '⏳' : '✅'
      let message = `${logStatus} ${shortUrl}`
      if (newStatus.wip) {
        message += ` - "${newStatus.match}" found in ${newStatus.location}`
      }
      log.info(message)
    }
  }
}
