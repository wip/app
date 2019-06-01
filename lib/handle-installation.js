module.exports = handleInstallation

const pluralize = require('pluralize')

const getConfig = require('./app-config')
const getPlan = require('./get-plan')
const handlePullRequestChange = require('./handle-pull-request-change')

// On install or accepted permissions, update all PRs for installs
// On uninstall, just log
//
//
async function handleInstallation (app, context) {
  const { action, repositories, repositories_added: added, repositories_removed: removed, installation: { account, repository_selection: selection } } = context.payload

  const log = context.log.child({
    name: getConfig().name,
    event: context.event,
    action,
    account: account.id,
    accountType: account.type.toLowerCase(),
    selection: selection
  })

  if (action === 'deleted') {
    log.info(`😭 ${account.type} ${account.login} uninstalled`)
    return
  }

  if (action === 'created') {
    log.info(`🤗 ${account.type} ${account.login} installed on ${pluralize('repository', repositories.length, true)}`)
    const repositoryNames = repositories.map(repository => repository.name)
    const plan = await getPlan(app, account)
    await Promise.all(repositoryNames.map(reset.bind(null, {
      plan,
      context,
      owner: account.login
    })))
    return
  }

  if (action === 'new_permissions_accepted') {
    log.info(`👌 ${account.type} ${account.login} accepted new permissions`)

    const options = context.github.apps.listRepos.endpoint.merge({
      per_page: 100
    })

    const repositories = await context.github.paginate(options)
    const repositoryNames = repositories.map(repository => repository.name)
    const plan = await getPlan(app, account)
    await Promise.all(repositoryNames.map(reset.bind(null, {
      plan,
      context,
      owner: account.login
    })))
    return
  }

  if (action === 'added') {
    log.info(`➕ ${account.type} ${account.login} added ${pluralize('repository', added.length, true)}`)

    const repositoryNames = added.map(repository => repository.name)
    const plan = await getPlan(app, account)

    await Promise.all(repositoryNames.map(reset.bind(null, {
      plan,
      context,
      owner: account.login
    })))
    return
  }

  log.info(`➖ ${account.type} ${account.login} removed ${pluralize('repository', removed.length, true)}`)
}

async function reset ({ plan, owner, context }, repo) {
  const options = context.github.pulls.list.endpoint.merge({
    owner,
    repo,
    state: 'open',
    sort: 'updated',
    direction: 'desc',
    per_page: 100
  })

  const pullRequests = await context.github.paginate(options)
  await Promise.all(
    pullRequests.map(pullRequest => {
      return handlePullRequestChange(null, {
        plan,
        github: context.github,
        log: context.log,
        repo (options) {
          return Object.assign({
            owner: owner,
            repo
          }, options)
        },
        event: 'pull_request',
        payload: {
          action: 'opened',
          pull_request: pullRequest,
          repository: pullRequest.base.repo
        }
      })
    })
  )
}
