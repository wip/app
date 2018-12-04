const lolex = require('lolex')
const { Application } = require('probot')
const simple = require('simple-mock')
const { beforeEach, test } = require('tap')

const plugin = require('../../')
const NOT_FOUND_ERROR = new Error('Not found')
NOT_FOUND_ERROR.code = 404
const SERVER_ERROR = new Error('Ooops')
SERVER_ERROR.code = 500
const NOW = new Date(0)

beforeEach(function (done) {
  lolex.install()
  this.app = new Application()
  this.githubMock = {
    apps: {
      checkMarketplaceListingAccount: simple.mock().rejectWith(NOT_FOUND_ERROR)
    },
    checks: {
      create: simple.mock(),
      listForRef: simple.mock().resolveWith({
        data: {
          check_runs: []
        }
      })
    },
    // for legacy commit status override (#124)
    repos: {
      createStatus: simple.mock(),
      getCombinedStatusForRef: simple.mock().resolveWith({ data: { statuses: [] } })
    }
  }
  this.app.auth = () => Promise.resolve(this.githubMock)
  this.logMock = simple.mock()
  this.logMock.info = simple.mock()
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
    owner: 'wip',
    repo: 'app',
    ref: 'sha123',
    check_name: 'WIP'
  })

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(this.githubMock.checks.create.callCount, 1)
  t.is(createCheckParams.owner, 'wip')
  t.is(createCheckParams.repo, 'app')
  t.is(createCheckParams.name, 'WIP')
  t.is(createCheckParams.status, 'completed')
  t.same(createCheckParams.completed_at, NOW)
  t.is(createCheckParams.status, 'completed')
  t.is(createCheckParams.conclusion, 'success')
  t.is(createCheckParams.output.title, 'Ready for review')
  t.match(createCheckParams.output.summary, /No match found based on configuration/)
  t.match(createCheckParams.output.text, /WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧"/)
  t.match(createCheckParams.output.text, /You can configure both the terms and the location that the WIP app will look for by signing up for the pro plan/)
  t.match(createCheckParams.output.text, /All revenue will be donated/i)
  t.is(createCheckParams.actions, undefined)

  // check resulting logs
  t.is(this.logMock.info.callCount, 1)
  t.is(this.logMock.info.lastCall.arg, '✅ wip/app#1')
  t.deepEqual(this.logMock.child.lastCall.arg, {
    name: 'WIP',
    account: 1,
    plan: 'free',
    repo: 1,
    private: false,
    event: 'pull_request',
    action: 'opened',
    wip: false,
    change: true,
    location: null,
    match: null
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
  t.notMatch(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 - "WIP" found in title')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)
  t.is(logParams.location, 'title')
  t.is(logParams.match, 'WIP')

  t.end()
})

test('new pull request with "[Work in Progress] Test" title', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-work-in-progress-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'in_progress')
  t.is(createCheckParams.output.title, 'Title contains "Work in Progress"')
  t.match(createCheckParams.output.summary, /The title "\[Work in Progress\] Test" contains "Work in Progress"/)
  t.notMatch(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 - "Work in Progress" found in title')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.location, 'title')
  t.is(logParams.match, 'Work in Progress')

  t.end()
})

test('new pull request with "🚧 Test" title', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-emoji-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'in_progress')
  t.is(createCheckParams.output.title, 'Title contains a construction sign!')
  t.match(createCheckParams.output.summary, /The title "🚧 Test" contains "🚧"/)
  t.notMatch(createCheckParams.output.summary, /You can override the status by adding "@wip ready for review"/)

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 - "🚧" found in title')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.location, 'title')
  t.is(logParams.match, '🚧')

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
  t.is(this.logMock.info.lastCall.arg, '✅ wip/app#1')

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
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 - "WIP" found in title')

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

  t.is(this.logMock.info.lastCall.arg, '😐 wip/app#1')

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
  t.is(this.logMock.info.lastCall.arg, '😐 wip/app#1')

  t.end()
})

test('active marketplace "free" plan', async function (t) {
  // simulate that user subscribed to free plan
  this.githubMock.apps.checkMarketplaceListingAccount = simple.mock().resolveWith({
    data: {
      marketplace_purchase: {
        plan: {
          price_model: 'FREE'
        }
      }
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // create new check run
  const createCheckParams = this.githubMock.checks.create.lastCall.arg
  t.is(createCheckParams.status, 'completed')
  t.is(createCheckParams.conclusion, 'success')

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '✅ wip/app#1')

  t.end()
})

test('request error', async function (t) {
  // simulate request error
  this.githubMock.checks.listForRef = simple.mock().rejectWith(SERVER_ERROR)
  this.logMock.error = simple.mock()

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // does not try to create new check run
  t.is(this.githubMock.checks.create.callCount, 0)

  // check resulting logs
  t.same(this.logMock.error.lastCall.arg, SERVER_ERROR)

  t.end()
})

test('request error (without code being parsed, see octokit/rest.js#684)', async function (t) {
  // simulate request error
  this.githubMock.checks.listForRef = simple.mock().rejectWith(new Error('{"code": 123}'))
  this.logMock.error = simple.mock()

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // does not try to create new check run
  t.is(this.githubMock.checks.create.callCount, 0)

  // check resulting logs
  t.same(this.logMock.error.lastCall.arg.code, 123)

  t.end()
})

test('Create check error', async function (t) {
  this.githubMock.checks.create = simple.mock().rejectWith(SERVER_ERROR)
  this.logMock.error = simple.mock()

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  t.same(this.logMock.error.lastCall.arg.code, 500)

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

test('Legacy commit status override (#124)', async function (t) {
  this.githubMock.repos.getCombinedStatusForRef = simple.mock().resolveWith({
    data: {
      statuses: [{
        context: 'WIP',
        state: 'pending',
        description: 'Pending — work in progress'
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))
  simple.restore()

  t.is(this.githubMock.repos.createStatus.callCount, 1)

  t.end()
})

test('Legacy commit status override - has overide (#124)', async function (t) {
  this.githubMock.repos.getCombinedStatusForRef = simple.mock().resolveWith({
    data: {
      statuses: [{
        context: 'WIP',
        state: 'success',
        description: 'Legacy Commit Status Override — see details'
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))
  simple.restore()

  t.is(this.githubMock.repos.createStatus.callCount, 0)

  t.end()
})
