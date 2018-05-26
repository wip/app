const handlePullRequestChange = require('../../../lib/handle-pull-request-change')

describe('handlePullRequestChange', () => {
  console.log = jest.fn()
  const createMockContext = prTitle => {
    return {
      repo: jest.fn(),
      payload: {
        pull_request: {
          head: { sha: 'sha' },
          title: prTitle,
          labels: [],
          number: 123,
          html_url: 'https://github.com/owner/repo/pull/123'
        }
      },
      github: {
        repos: {
          createStatus: jest.fn(),
          getCombinedStatusForRef: jest.fn().mockReturnValue({data: {statuses: []}})
        },
        pullRequests: {
          getCommits: jest.fn().mockReturnValue({data: []})
        }
      }
    }
  }

  const createMockCommitContext = commitMessage => {
    const context = createMockContext('Default pull request title')

    context.github.pullRequests.getCommits = jest.fn().mockReturnValue({
      data: [{ commit: { message: commitMessage } }]
    })

    return context
  }

  const createMockLabelContext = labelName => {
    const context = createMockContext('Default pull request title')

    context.payload.pull_request.labels = [{ name: labelName }]

    return context
  }

  const createMockStatusContext = (status, title = 'Default pull request title') => {
    const context = createMockContext(title)

    context.github.repos.getCombinedStatusForRef = jest.fn().mockReturnValue({
      data: { statuses: [{ context: 'WIP', state: status }] }
    })

    return context
  }

  const pendingStatusObject = {
    context: 'WIP',
    description: 'work in progress',
    sha: 'sha',
    state: 'pending',
    target_url: 'https://github.com/apps/wip'
  }

  const successStatusObject = {
    context: 'WIP',
    description: 'ready for review',
    sha: 'sha',
    state: 'success',
    target_url: 'https://github.com/apps/wip'
  }

  it('creates pending status if PR title contains `wip`', async () => {
    const context = createMockContext('[wip] Pull request title')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(pendingStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "[wip] Pull request title" — pending')
  })

  it('creates pending status if PR title contains `WIP`', async () => {
    const context = createMockContext('[WIP] Pull request title')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(pendingStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "[WIP] Pull request title" — pending')
  })

  it('creates pending status if PR title contains `do not merge` case insensitive', async () => {
    const context = createMockContext('foo dO NoT mERGe bar')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(pendingStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "foo dO NoT mERGe bar" — pending')
  })

  it('creates success status if PR title contains `work in progress`', async () => {
    const context = createMockContext('Pull request title – work in progress')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(pendingStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "Pull request title – work in progress" — pending')
  })

  it('creates success status if PR title does NOT contain `wip`', async () => {
    const context = createMockContext('[xxx] Pull request title')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(successStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "[xxx] Pull request title" — success')
  })

  it('creates pending status if a commit message contains `wip`', async () => {
    const context = createMockCommitContext('[wip] commit message')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(pendingStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "Default pull request title" — pending')
  })

  it('creates pending status if a commit message contains `do not merge`', async () => {
    const context = createMockCommitContext('my DO NOT MERGE commit message')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(pendingStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "Default pull request title" — pending')
  })

  it('creates success status if a commit message does not contain `wip` or `do not merge`', async () => {
    const context = createMockCommitContext('my commit message')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(successStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "Default pull request title" — success')
  })

  it('creates pending status if a label contains `wip`', async () => {
    const context = createMockLabelContext('WIP')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(pendingStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "Default pull request title" — pending')
  })

  it('creates pending status if a label contains `do not merge`', async () => {
    const context = createMockLabelContext('do not merge')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(pendingStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "Default pull request title" — pending')
  })

  it('creates success status if a label does not contain `wip` or `do not merge`', async () => {
    const context = createMockLabelContext('bug')
    await handlePullRequestChange(context)

    expect(context.repo).lastCalledWith(successStatusObject)
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "Default pull request title" — success')
  })

  it('does not create a status if there is no change', async () => {
    const context = createMockStatusContext('pending', '[wip] Pull request title')
    await handlePullRequestChange(context)

    expect(context.github.repos.createStatus).not.toHaveBeenCalled()
    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "[wip] Pull request title" — pending (unchanged)')
  })

  it('handles error', async () => {
    const context = createMockContext('[wip] Pull request title')
    context.github.repos.createStatus = jest.fn().mockRejectedValue(new Error('boom banana'))
    await handlePullRequestChange(context)

    expect(console.log).lastCalledWith('https://github.com/owner/repo/pull/123 "[wip] Pull request title" — Error: boom banana')
  })
})
