const lolex = require('lolex')
const { Application } = require('probot')
const simple = require('simple-mock')
const { beforeEach, test } = require('tap')

const plugin = require('../../')

beforeEach(function (done) {
  lolex.install()
  this.app = new Application()
  this.githubMock = {}
  this.app.auth = () => Promise.resolve(this.githubMock)
  this.logMock = simple.mock()
  this.logMock.debug = simple.mock()
  this.logMock.trace = simple.mock()
  this.logMock.info = simple.mock()
  this.logMock.warn = simple.mock()
  this.logMock.error = simple.mock().callFn(console.log)
  this.logMock.child = simple.mock().returnWith(this.logMock)
  this.app.log = this.logMock
  this.app.load(plugin)
  done()
})

test('purchase free', async function (t) {
  await this.app.receive(require('./events/purchase.json'))

  t.is(this.logMock.info.lastCall.arg, '🆕🆓 Organization wip purchased Free')

  t.end()
})
test('purchase enterprise', async function (t) {
  await this.app.receive(require('./events/purchase-enterprise.json'))

  t.is(this.logMock.info.lastCall.arg, '🆕💰 Organization wip purchased Enterprise')

  t.end()
})
test('upgrade', async function (t) {
  await this.app.receive(require('./events/upgrade.json'))

  t.is(this.logMock.info.lastCall.arg, '⬆️💵 Organization wip changed to Pro')

  t.end()
})
test('upgrade', async function (t) {
  await this.app.receive(require('./events/downgrade.json'))

  t.is(this.logMock.info.lastCall.arg, '⬇️💵 Organization wip changed to Pro')

  t.end()
})
test('cancellation', async function (t) {
  await this.app.receive(require('./events/cancellation.json'))

  t.is(this.logMock.info.lastCall.arg, '🚫🆓 Organization wip cancelled Free')

  t.end()
})

test('pending_change', async function (t) {
  await this.app.receive(require('./events/upgrade-pending.json'))

  t.is(this.logMock.info.callCount, 0)

  t.end()
})
