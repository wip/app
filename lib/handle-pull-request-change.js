module.exports = handlePullRequestChange

async function handlePullRequestChange (context) {
  const {pull_request: {title, head, number, labels}, repository} = context.payload
  const labelNames = labels.map(label => label.name)
  const isWip = containsWIP(title) || labelNames.some(containsWIP) || await commitsContainWIP(context)
  const status = isWip ? 'pending' : 'success'

  if (context.payload.repository.private) {
    console.log(`${repository.owner.login}/<private>#${number} — ${status}`)
  } else {
    console.log(`${repository.full_name}#${number} "${title}" — ${status}`)
  }

  context.github.repos.createStatus(context.repo({
    sha: head.sha,
    state: status,
    target_url: 'https://github.com/apps/wip',
    description: isWip ? 'work in progress – do not merge!' : 'ready for review',
    context: 'WIP'
  }))
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
