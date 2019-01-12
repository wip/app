const proxyquire = require('proxyquire').noCallThru()
const { test } = require('tap')

test('returns "pro" if account is enabled manually', async function (t) {
  const getPlan = proxyquire('../../lib/get-plan', {
    '../pro-plan-for-free': [ 'foo' ]
  })
  const app = {}
  const owner = { login: 'foo' }
  const plan = await getPlan(app, owner)

  t.is(plan, 'pro')
  t.end()
})

test('throws error if getting current plan fails with error other than 404', async function (t) {
  const getPlan = require('../../lib/get-plan')
  const app = {
    auth () {
      return {
        apps: {
          checkAccountIsAssociatedWithAny () {
            throw new Error('oops')
          }
        }
      }
    }
  }
  const owner = { login: 'foo' }
  try {
    await getPlan(app, owner)
    t.fail('should throw error')
  } catch (error) {
    t.is(error.message, 'oops')
  }

  t.end()
})
