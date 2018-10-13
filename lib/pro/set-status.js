module.exports = setStatusPro

const getAppConfig = require('../app-config')
// const PRO_PLAN_FOR_FREE = require('../../pro-plan-for-free')

const locationLabel = {
  title: 'title',
  label_name: 'label',
  commit_subject: 'commit subject'
}

function setStatusPro (newStatus, context) {
  const { pull_request: pullRequest } = context.payload
  const { name } = getAppConfig()

  const checkOptions = {
    name: name,
    status: 'in_progress',
    head_branch: '', // workaround for https://github.com/octokit/rest.js/issues/874
    head_sha: pullRequest.head.sha,
    output: {
      title: 'Work in progress',
      summary: `The ${locationLabel[newStatus.location]} "${newStatus.text}" contains "${newStatus.match}".

  You can override the status by adding "@wip ready for review" to the end of the [pull request description](${pullRequest.html_url}#discussion_bucket).`,
      text: `\`.github/wip.yml\` does not exist, the default configuration is applied:

\`\`\`yaml
terms:
- wip
- work in progress
- 🚧
locations: title
\`\`\`

Read more about [WIP configuration](#tbd)`
    },
    actions: [{
      label: '✅ Ready for review',
      description: 'override status to "success"',
      identifier: `override:${pullRequest.number}`
    }]
  }

  if (!newStatus.wip) {
    checkOptions.status = 'completed'
    checkOptions.conclusion = 'success'
    checkOptions.completed_at = new Date()
    checkOptions.output.title = 'Ready for review'
    checkOptions.output.summary = 'No match found based on configuration.'
    checkOptions.actions = []
  }

  if (newStatus.config) {
    checkOptions.output.text = `The following configuration from \`.github/wip.yml\` was applied:

\`\`\`yaml
${newStatus.config}
\`\`\``
  }

  if (newStatus.override) {
    checkOptions.output.title += ' (override)'
    checkOptions.output.summary = 'The status has been set to success by adding `@wip ready for review` to the pull request comment. You can reset the status by removing it.'
    checkOptions.output.text = 'Learn more about [WIP override](#tbd)'
    checkOptions.actions.push({
      label: '🔄 Reset',
      description: 'Remove status override',
      identifier: `reset:${pullRequest.number}`
    })
  }

  // uncomment once WIP is listed in marketplace
  //   if (PRO_PLAN_FOR_FREE.includes(repo.owner.login)) {
  //     checkOptions.output.summary += `
  // ### 🆓💸 The account ${repo.owner.login} is [enabled for the pro plan for free](https://github.com/wip/app/blob/master/pro-plan-for-free.js)
  //
  // Please consider [signing up for the pro plan](https://github.com/marketplace/wip), all revenue is donated to [Rails Girls Summer of Code](https://railsgirlssummerofcode.org/).`
  //   }

  return context.github.checks.create(context.repo(checkOptions))
}
