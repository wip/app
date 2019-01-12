const { test } = require('tap')

const getConfig = require('../../lib/pro/get-config')

test('throws error if getting config fails with error other than 404', async function (t) {
  try {
    await getConfig({
      github: {
        repos: {
          getContents () {
            throw new Error('oops')
          }
        }
      },
      repo () {
        return {}
      }
    })
    t.fail('should throw error')
  } catch (error) {
    t.is(error.message, 'oops')
  }

  t.end()
})
