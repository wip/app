module.exports = handlePullRequestChange

async function handlePullRequestChange (robot, context) {
  const title = context.payload.pull_request.title

  const commits = await context.github.pullRequests.getCommits({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    number: context.payload.pull_request.number
  })

  const isWip = commits.data.some(element => { return containsWIP(element.commit.message) }) || containsWIP(title)

  const status = isWip ? 'pending' : 'success'

  console.log(`Updating PR "${title}" (${context.payload.pull_request.html_url}): ${status}`)

  context.github.repos.createStatus(context.repo({
    sha: context.payload.pull_request.head.sha,
    state: status,
    target_url: 'https://github.com/apps/wip',
    description: isWip ? 'work in progress – do not merge!' : 'ready for review',
    context: 'WIP'
  }))
}

function containsWIP (string) {
  return /\b(wip|do not merge)\b/i.test(string)
}
