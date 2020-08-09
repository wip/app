module.exports = getConfig;

const defaultConfig = require("./default-config");

// load config from the repository’s .github/wip.yml file and normalize it
async function getConfig(context) {
  let config = await context.config("wip.yml");

  if (!config) {
    return {
      config: [defaultConfig],
    };
  }

  if (!Array.isArray(config)) {
    config = [config];
  }

  config = config.map((entry) => {
    ["terms", "locations"].forEach((key) => {
      if (!entry[key]) {
        entry[key] = defaultConfig[key];
      }

      if (!Array.isArray(entry[key])) {
        entry[key] = [entry[key]];
      }

      entry[key] = entry[key].map(String);
    });

    return entry;
  });

  return {
    config,
    hasCustomConfig: true,
  };
}
