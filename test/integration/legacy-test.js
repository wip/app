const lolex = require('lolex')
const { Application } = require('probot')
const simple = require('simple-mock')
const { beforeEach, test } = require('tap')

const plugin = require('../../')
const NOT_FOUND_ERROR = new Error('Not found')
NOT_FOUND_ERROR.code = 404
const SERVER_ERROR = new Error('Ooops')
SERVER_ERROR.code = 500

beforeEach(function (done) {
  lolex.install()
  this.app = new Application()
  this.githubMock = {
    apps: {
      checkMarketplaceListingAccount: simple.mock().rejectWith(NOT_FOUND_ERROR)
    },
    checks: {
      listForRef: simple.mock().rejectWith(new Error('{"code": 403}'))
    },
    pullRequests: {
      getCommits: simple.mock().resolveWith({ data: [] })
    },
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

  // check getting current status
  t.is(this.githubMock.repos.getCombinedStatusForRef.callCount, 1)
  const getStatusParams = this.githubMock.repos.getCombinedStatusForRef.lastCall.arg
  t.is(getStatusParams.owner, 'wip')
  t.is(getStatusParams.repo, 'app')
  t.is(getStatusParams.ref, 'sha123')

  // check setting new status
  t.is(this.githubMock.repos.createStatus.callCount, 1)

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '✅ wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, false)
  t.is(logParams.change, true)
  t.is(logParams.legacy, true)

  t.end()
})

test('new pull request with "[WIP] Test" title', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-wip-title.json'))

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)
  t.is(logParams.legacy, true)

  t.end()
})

test('new pull request with "foo dO NoT mERGe bar" title', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-do-not-merge-title.json'))

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)
  t.is(logParams.legacy, true)

  t.end()
})

test('new pull request with "[Work in Progress] Test" title', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-work-in-progress-title.json'))

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)
  t.is(logParams.legacy, true)

  t.end()
})

test('new pull request with "WIP" in commit', async function (t) {
  // commit with "WIP: test" subject
  this.githubMock.pullRequests.getCommits = simple.mock().resolveWith({
    data: [{
      commit: {
        message: 'WIP: test'
      }
    }]
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)
  t.is(logParams.legacy, true)

  t.end()
})

test('new pull request with "DO NOT MERGE" in commit', async function (t) {
  // commit with "DO NOT MERGE: test" subject
  this.githubMock.pullRequests.getCommits = simple.mock().resolveWith({
    data: [{
      commit: {
        message: 'DO NOT MERGE: test'
      }
    }]
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)
  t.is(logParams.legacy, true)

  t.end()
})

test('new pull request without "WIP" in commit', async function (t) {
  // commit with "DO NOT MERGE: test" subject
  this.githubMock.pullRequests.getCommits = simple.mock().resolveWith({
    data: [{
      commit: {
        message: 'foo'
      }
    }]
  })

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '✅ wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, false)
  t.is(logParams.change, true)
  t.is(logParams.legacy, true)

  t.end()
})

test('new pull request with "WIP" in label', async function (t) {
  await this.app.receive(require('./events/new-pull-request-with-wip-label.json'))

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '⏳ wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, true)
  t.is(logParams.legacy, true)

  t.end()
})

test('does not create a status if there is no change', async function (t) {
  // return "pending" status
  this.githubMock.repos.getCombinedStatusForRef = simple.mock().resolveWith({
    data: {
      statuses: [{
        context: 'WIP',
        state: 'pending'
      }]
    }
  })

  await this.app.receive(require('./events/new-pull-request-with-wip-title.json'))

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, '😐 wip/app#1 (legacy)')
  const logParams = this.logMock.child.lastCall.arg
  t.is(logParams.wip, true)
  t.is(logParams.change, false)
  t.is(logParams.legacy, true)

  t.end()
})

test('request error', async function (t) {
  // simulate request error
  this.githubMock.repos.createStatus = simple.mock().rejectWith(SERVER_ERROR)
  this.logMock.error = simple.mock()

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // check resulting logs
  t.same(this.logMock.error.lastCall.arg, SERVER_ERROR)

  t.end()
})

test('request error (without code being parsed, see octokit/rest.js#684)', async function (t) {
  // simulate request error
  this.githubMock.repos.createStatus = simple.mock().rejectWith(new Error('{"code": 123}'))
  this.logMock.error = simple.mock()

  await this.app.receive(require('./events/new-pull-request-with-test-title.json'))

  // check resulting logs
  t.same(this.logMock.error.lastCall.arg.code, 123)

  t.end()
})
