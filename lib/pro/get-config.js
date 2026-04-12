module.exports = getConfig;

const defaultConfig = require("./default-config");
const getConfigFromRepo = require("../utils/get-config-from-repo");

// load config from the repository's .github/wip.yml file and normalize it
async function getConfig({ octokit, payload }) {
  let config = await getConfigFromRepo(octokit, payload);

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
