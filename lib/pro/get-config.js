module.exports = getConfig

const yaml = require('js-yaml')
const defaultConfig = require('./default-config')

// load config from the repository’s .github/wip.yml file and normalize it
async function getConfig (context) {
  try {
    const { data: { content } } = await context.github.repos.getContent(context.repo({
      path: '.github/wip.yml'
    }))

    const rawConfig = Buffer.from(content, 'base64').toString()
    let config = yaml.safeLoad(rawConfig)

    if (!Array.isArray(config)) {
      config = [config]
    }

    config = config.map(entry => {
      ['terms', 'locations'].forEach(key => {
        if (!entry[key]) {
          entry[key] = defaultConfig[key]
        }

        if (!Array.isArray(entry[key])) {
          entry[key] = [entry[key]]
        }

        entry[key] = entry[key].map(String)
      })

      return entry
    })

    return {
      config,
      rawConfig
    }
  } catch (error) {
    if (error.code === 404) {
      return {
        config: [defaultConfig]
      }
    }

    throw error
  }
}
