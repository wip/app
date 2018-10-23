module.exports = setStatusFree

const getAppConfig = require('../app-config')

function setStatusFree (newStatus, context) {
  const pullRequest = context.payload.pull_request
  const { name } = getAppConfig()

  const checkOptions = {
    name: name,
    head_branch: '', // workaround for https://github.com/octokit/rest.js/issues/874
    head_sha: pullRequest.head.sha,
    status: 'in_progress',
    output: {
      title: 'Work in progress',
      summary: `The title "${pullRequest.title}" contains "${newStatus.match}".`,
      text: `By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".
      
You can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Rails Girls Summer of Code](https://railsgirlssummerofcode.org/).`
    }
  }

  if (!newStatus.wip) {
    checkOptions.status = 'completed'
    checkOptions.conclusion = 'success'
    checkOptions.completed_at = new Date()
    checkOptions.output.title = 'Ready for review'
    checkOptions.output.summary = 'No match found based on configuration'
  }

  return context.github.checks.create(context.repo(checkOptions))
}
