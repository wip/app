const lolex = require('lolex')
const { Application } = require('probot')
const simple = require('simple-mock')
const { beforeEach, test } = require('tap')

const plugin = require('../../')
// "code" was renamed to "status", we keep both for compatibility with probot-config
const NOT_FOUND_ERROR = Object.assign(new Error('Not found'), { status: 404, code: 404 })

beforeEach(function (done) {
  lolex.install()
  this.app = new Application()
  this.githubMock = {
    apps: {
      checkAccountIsAssociatedWithAny: simple.mock().resolveWith({
        data: {
          marketplace_purchase: {
            plan: {
              price_model: 'FLAT_RATE'
            }
          }
        }
      })
    },
    checks: {
      create: simple.mock(),
      listForRef: simple.mock().resolveWith({
        data: {
          check_runs: []
        }
      })
    },
    repos: {
      getContents: simple.mock().rejectWith(NOT_FOUND_ERROR),

      // for legacy commit status override (#124)
      createStatus: simple.mock(),
      getCombinedStatusForRef: simple.mock().resolveWith({ data: { statuses: [] } })
    },
    pullRequests: {
      listCommits: simple.mock().resolveWith({ data: [] })
    }
  }
  this.app.auth = () => Promise.resolve(this.githubMock)
  this.logMock = simple.mock()
  this.logMock.trace = simple.mock()
  this.logMock.info = simple.mock()
  this.logMock.warn = simple.mock()
  this.logMock.error = simple.mock().callFn(console.log)
  this.logMock.child = simple.mock().returnWith(this.logMock)
  this.app.log = this.logMock
  this.app.load(plugin)
  done()
})

test('new pull request with "Test" title', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // check for current status
  t.is(this.githubMock.checks.listForRef.callCount, 1)
  t.deepEqual(this.githubMock.checks.listForRef.lastCall.arg, {
    check_name: 'WIP',
    owner: 'wip',
    repo: 'app',
    ref: 'sha123'
  })

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(this.githubMock.checks.create.callCount, 1)
  t.is(createCheckParams.owner, 'wip')
  t.is(createCheckParams.repo, 'app')
  t.is(createCheckParams.name, 'WIP')
  t.is(createCheckParams.status, 'completed')
  t.is(createCheckParams.started_at, '1970-01-01T00:00:00.000Z')
  t.is(createCheckParams.completed_at, '1970-01-01T00:00:00.000Z')
  t.is(createCheckParams.status, 'completed')
  t.is(createCheckParams.conclusion, 'success')
  t.is(createCheckParams.output.title, 'Ready for review')
  t.match(createCheckParams.output.summary, /No match found based on configuration/)
  t.match(createCheckParams.output.text, /the default configuration is applied/)

  // check resulting logs
  t.is(this.logMock.info.lastCall.args[1], '✅ wip/app#1')
  t.is(this.logMock.info.callCount, 1)
  t.deepEqual(this.logMock.child.lastCall.arg, {
    name: 'WIP',
    account: 1,
    plan: 'pro',
    repo: 1,
    private: false,
    event: 'pull_request',
    action: 'opened',
    wip: false,
    change: true,
    override: null,
    location: null,
    match: null,
    hasConfig: false
  })

  t.end()
})

test('new pull request with "[WIP] Test" title', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-wip-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'in_progress')
  t.is(createCheckParams.output.title, 'Title contains "WIP"')
  t.match(createCheckParams.output.summary, /The title "\[WIP\] Test" contains "WIP"/)
  t.match(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)
  t.is(logParams.location, 'title')
  t.is(logParams.match, 'WIP')

  t.end()
})

test('pending pull request with "Test" title', async function (t) {
  // simulate existing check runs
  this.githubMock.checks.listForRef = simple.mock().resolveWith({
    data: {
      check_runs: [{
        status: 'pending'
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'completed')
  t.is(createCheckParams.conclusion, 'success')

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, false)
  t.is(logParams.change, true)

  t.end()
})

test('ready pull request with "[WIP] Test" title', async function (t) {
  // simulate existing check runs
  this.githubMock.checks.listForRef = simple.mock().resolveWith({
    data: {
      check_runs: [{
        conclusion: 'success'
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-wip-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'in_progress')

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)

  t.end()
})

test('pending pull request with "[WIP] Test" title', async function (t) {
  // simulate existing check runs
  this.githubMock.checks.listForRef = simple.mock().resolveWith({
    data: {
      check_runs: [{
        status: 'pending'
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-wip-title.json'))

  // does not create new check run
  t.is(this.githubMock.checks.create.callCount, 0)

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, false)

  t.end()
})

test('ready pull request with "Test" title', async function (t) {
  // simulate existing check runs
  this.githubMock.checks.listForRef = simple.mock().resolveWith({
    data: {
      check_runs: [{
        conclusion: 'success'
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // does not create new check run
  t.is(this.githubMock.checks.create.callCount, 0)

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, false)
  t.is(logParams.change, false)

  t.end()
})

test('custom term: 🚧', async function (t) {
  // custom configuration
  this.githubMock.repos.getContents = simple.mock().resolveWith({
    data: {
      content: Buffer.from('terms: 🚧').toString('base64')
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-emoji-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(this.githubMock.checks.create.callCount, 1)
  t.is(createCheckParams.owner, 'wip')
  t.is(createCheckParams.repo, 'app')
  t.is(createCheckParams.name, 'WIP')
  t.is(createCheckParams.status, 'in_progress')
  t.is(createCheckParams.completed_at, undefined)
  t.is(createCheckParams.status, 'in_progress')
  t.is(createCheckParams.output.title, 'Title contains a construction emoji')
  t.match(createCheckParams.output.summary, /The title "🚧 Test" contains "🚧"/)
  t.match(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)
  t.match(createCheckParams.output.text, /<td>🚧<\/td>/)

  // check resulting logs
  t.is(this.logMock.info.lastCall.args[1], '⏳ wip/app#1 - "🚧" found in title')
  t.is(this.logMock.info.callCount, 1)
  t.deepEqual(this.logMock.child.lastCall.arg, {
    name: 'WIP',
    account: 1,
    repo: 1,
    private: false,
    plan: 'pro',
    event: 'pull_request',
    action: 'opened',
    wip: true,
    change: true,
    override: null,
    location: 'title',
    match: '🚧',
    hasConfig: true
  })

  t.end()
})

test('custom term: 🚧NoSpace', async function (t) {
  // custom configuration
  this.githubMock.repos.getContents = simple.mock().resolveWith({
    data: {
      content: Buffer.from('terms: 🚧').toString('base64')
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-emoji-no-space-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(this.githubMock.checks.create.callCount, 1)
  t.is(createCheckParams.owner, 'wip')
  t.is(createCheckParams.repo, 'app')
  t.is(createCheckParams.name, 'WIP')
  t.is(createCheckParams.status, 'in_progress')
  t.is(createCheckParams.completed_at, undefined)
  t.is(createCheckParams.status, 'in_progress')
  t.is(createCheckParams.output.title, 'Title contains a construction emoji')
  t.match(createCheckParams.output.summary, /The title "🚧Test" contains "🚧"/)
  t.match(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)
  t.match(createCheckParams.output.text, /<td>🚧<\/td>/)

  // check resulting logs
  t.is(this.logMock.info.lastCall.args[1], '⏳ wip/app#1 - "🚧" found in title')
  t.is(this.logMock.info.callCount, 1)
  t.deepEqual(this.logMock.child.lastCall.arg, {
    name: 'WIP',
    account: 1,
    repo: 1,
    private: false,
    plan: 'pro',
    event: 'pull_request',
    action: 'opened',
    wip: true,
    change: true,
    override: null,
    location: 'title',
    match: '🚧',
    hasConfig: true
  })

  t.end()
})

test('custom location: label_name', async function (t) {
  // custom configuration
  this.githubMock.repos.getContents = simple.mock().resolveWith({
    data: {
      content: Buffer.from('locations: label_name').toString('base64')
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-wip-label.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'in_progress')
  t.match(createCheckParams.output.summary, /The label "WIP" contains "WIP"/)
  t.match(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)
  t.match(createCheckParams.output.text, /<td>label_name<\/td>/)

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.location, 'label_name')
  t.is(logParams.match, 'WIP')
  t.is(createCheckParams.output.title, 'Label contains "WIP"')

  t.end()
})

test('custom location: commits', async function (t) {
  // custom configuration
  this.githubMock.repos.getContents = simple.mock().resolveWith({
    data: {
      content: Buffer.from('locations: commit_subject').toString('base64')
    }
  })

  // commit with "WIP: test" subject
  this.githubMock.pullRequests.listCommits = simple.mock().resolveWith({
    data: [{
      commit: {
        message: 'WIP: test'
      }
    }]
  })

  await this.app.receive(require('./events/new-pull-request-with-wip-label.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'in_progress')
  t.match(createCheckParams.output.summary, /The commit subject "WIP: test" contains "WIP"/)
  t.match(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)
  t.match(createCheckParams.output.text, /<td>commit_subject<\/td>/)

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.location, 'commit_subject')
  t.is(logParams.match, 'WIP')

  t.end()
})

test('complex config', async function (t) {
  // custom configuration
  const config = `
- terms:
  - 🚧
  - WIP
  locations:
  - title
  - label_name
- terms:
  - fixup!
  - squash!
  locations: commit_subject`
  this.githubMock.repos.getContents = simple.mock().resolveWith({
    data: {
      content: Buffer.from(config).toString('base64')
    }
  })

  // commits
  this.githubMock.pullRequests.listCommits = simple.mock().resolveWith({
    data: [{
      commit: {
        message: 'fixup! test'
      }
    }, {
      commit: {
        message: 'test'
      }
    }]
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'in_progress')
  t.match(createCheckParams.output.summary, /The commit subject "fixup! test" contains "fixup!"/)
  t.match(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)
  t.match(createCheckParams.output.text, /<td>commit_subject<\/td>/)

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.location, 'commit_subject')
  t.is(logParams.match, 'fixup!')

  t.end()
})

test('loads config from .github repository', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-emoji-title.json'))

  t.is(this.githubMock.repos.getContents.callCount, 2)
  t.deepEqual(this.githubMock.repos.getContents.lastCall.arg, {
    owner: 'wip',
    repo: '.github',
    path: '.github/wip.yml'
  })

  t.end()
})

test('loads commits once only', async function (t) {
  // custom configuration
  const config = `
- terms: 'foo'
  locations: commit_subject
- terms: 'bar'
  locations: commit_subject`
  this.githubMock.repos.getContents = simple.mock().resolveWith({
    data: {
      content: Buffer.from(config).toString('base64')
    }
  })

  // commits
  this.githubMock.pullRequests.listCommits = simple.mock().resolveWith({
    data: [{
      commit: {
        message: 'test'
      }
    }]
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  t.is(this.githubMock.pullRequests.listCommits.callCount, 1)

  t.end()
})

test('override', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-wip-title-and-override.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'completed')
  t.is(createCheckParams.conclusion, 'success')
  t.is(createCheckParams.output.title, 'Ready for review (override)')
  t.match(createCheckParams.output.summary, /The status has been set to success by adding `@wip ready for review` to the pull request comment/)

  // check resulting logs
  t.is(this.logMock.info.lastCall.args[1], '❗️ wip/app#1')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, false)
  t.is(logParams.override, true)
  t.is(logParams.change, true)

  t.end()
})

test('pending pull request with override', async function (t) {
  // no existing check runs
  this.githubMock.checks.listForRef = simple.mock().resolveWith({
    data: {
      check_runs: [{
        status: 'in_progress',
        output: {
          title: 'Ready for review (override)'
        }
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'completed')
  t.is(createCheckParams.conclusion, 'success')
  t.is(createCheckParams.output.title, 'Ready for review')
  t.match(createCheckParams.output.summary, /No match found based on configuration/)

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, false)
  t.is(logParams.change, true)

  t.end()
})

test('pending pull request with override and "[WIP] test" title', async function (t) {
  // no existing check runs
  this.githubMock.checks.listForRef = simple.mock().resolveWith({
    data: {
      check_runs: [{
        status: 'in_progress',
        output: {
          title: 'Ready for review (override)'
        }
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-wip-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'in_progress')

  // check resulting logs
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)

  t.end()
})

test('custom APP_NAME', async function (t) {
  simple.mock(process.env, 'APP_NAME', 'WIP (local-dev)')
  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))
  simple.restore()

  t.is(this.githubMock.checks.listForRef.lastCall.arg.check_name, 'WIP (local-dev)')
  t.is(this.githubMock.checks.create.lastCall.arg.name, 'WIP (local-dev)')
  t.is(this.logMock.child.lastCall.arg.name, 'WIP (local-dev)')

  t.end()
})
