module.exports = handleInstallation;

const getConfig = require("./app-config");
const resetRepositories = require("./common/reset-repositories");

const PLURAL_RULES = new Intl.PluralRules("en-US");

/**
 * On install or accepted permissions: update all PRs for installs
 * On uninstall: just log
 *
 * @param {object} options
 * @param {import('octokit').App} options.app
 * @param {import('octokit').Octokit} options.octokit
 * @param {object} options.payload
 * @param {import('pino').Logger} options.log
 * @param {string} options.eventName
 */
async function handleInstallation({ app, octokit, payload, log, eventName }) {
  const {
    action,
    repositories,
    repositories_added: added,
    repositories_removed: removed,
    installation: { account, repository_selection: selection },
  } = payload;

  const childLog = log.child({
    name: getConfig().name,
    event: eventName,
    action,
    account: account.id,
    accountType: account.type.toLowerCase(),
    accountName: account.login,
    selection: selection,
  });

  if (action === "deleted") {
    childLog.info(`😭 ${account.type} ${account.login} uninstalled`);
    return;
  }

  if (action === "removed") {
    childLog.info(
      `➖ ${account.type} ${account.login} removed ${pluralize(
        removed.length,
        "repository",
        "repositories",
      )}`,
    );
    return;
  }

  if (action === "created") {
    childLog.info(
      `🤗 ${account.type} ${account.login} installed on ${pluralize(
        repositories.length,
        "repository",
        "repositories",
      )}`,
    );

    return resetRepositories({
      app,
      octokit,
      log,
      account,
      repositories,
    });
  }

  if (action === "added") {
    childLog.info(
      `➕ ${account.type} ${account.login} added ${pluralize(
        added.length,
        "repository",
        "repositories",
      )}`,
    );

    return resetRepositories({
      app,
      octokit,
      log,
      account,
      repositories: added,
    });
  }

  if (action === "new_permissions_accepted") {
    childLog.info(
      `👌 ${account.type} ${account.login} accepted new permissions`,
    );

    return resetRepositories({
      app,
      octokit,
      log,
      account,
      repositories: await octokit.paginate(
        octokit.rest.apps.listReposAccessibleToInstallation,
        { per_page: 100 },
      ),
    });
  }

  childLog.info(`ℹ️ installation.${action} by ${account.login}`);
}

/**
 * @param {number} count
 * @param {string} singular
 * @param {string} plural
 * @returns {string}
 */
function pluralize(count, singular, plural) {
  const grammaticalNumber = PLURAL_RULES.select(count);
  const word = grammaticalNumber === "one" ? singular : plural;
  return `${count} ${word}`;
}
