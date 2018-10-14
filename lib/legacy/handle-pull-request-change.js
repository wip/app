module.exports = handlePullRequestChange

const getConfig = require('../app-config')

async function handlePullRequestChange (context) {
  const { action, pull_request: pr, repository: repo } = context.payload
  const currentStatus = await getCurrentStatus(context)
  const labelNames = pr.labels.map(label => label.name)
  const isWip = containsWIP(pr.title) || labelNames.some(containsWIP) || await commitsContainWIP(context)
  const newStatus = isWip ? 'pending' : 'success'
  const shortUrl = `${repo.full_name}#${pr.number}`

  const hasChange = currentStatus !== newStatus
  const log = context.log.child({
    name: getConfig().name,
    event: context.event,
    action,
    private: repo.private,
    account: repo.owner.id,
    repo: repo.id,
    change: hasChange,
    wip: isWip,
    legacy: true
  })

  // if status did not change then don’t call .createStatus. Quotas for mutations
  // are much more restrictive so we want to avoid them if possible
  if (!hasChange) {
    return log.info(`😐 ${shortUrl} (legacy)`)
  }

  try {
    await context.github.repos.createStatus(context.repo({
      sha: pr.head.sha,
      state: newStatus,
      target_url: 'https://github.com/apps/wip',
      description: isWip ? 'work in progress' : 'ready for review',
      context: getConfig().name
    }))

    const logStatus = isWip ? '⏳' : '✅'
    log.info(`${logStatus} ${shortUrl} (legacy)`)
  } catch (error) {
    try {
      // workaround for https://github.com/octokit/rest.js/issues/684
      const parsed = JSON.parse(error.message)
      for (const key in parsed) {
        error[key] = parsed[key]
      }
      context.log.error(error)
    } catch (e) {
      context.log.error(error)
    }
  }
}

async function getCurrentStatus (context) {
  const { data: { statuses } } = await context.github.repos.getCombinedStatusForRef(context.repo({
    ref: context.payload.pull_request.head.sha
  }))

  return (statuses.find(status => status.context === getConfig().name) || {}).state
}

async function commitsContainWIP (context) {
  const commits = await context.github.pullRequests.getCommits(context.repo({
    number: context.payload.pull_request.number
  }))

  return commits.data.map(element => element.commit.message).some(containsWIP)
}

function containsWIP (string) {
  return /\b(wip|do not merge|work in progress)\b/i.test(string)
}
