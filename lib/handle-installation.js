module.exports = handleInstallation;

const getConfig = require("./app-config");
const resetRepositories = require("./common/reset-repositories");

const PLURAL_RULES = new Intl.PluralRules("en-US");

/**
 * On install or accepted permissions: update all PRs for installs
 * On uninstall: just log
 *
 * @param {import('probot').Probot} app
 * @param {import('probot').Context} context
 */
async function handleInstallation(app, context) {
  const {
    action,
    repositories,
    repositories_added: added,
    repositories_removed: removed,
    installation: { account, repository_selection: selection },
  } = context.payload;

  const log = context.log.child({
    name: getConfig().name,
    event: context.name,
    action,
    account: account.id,
    accountType: account.type.toLowerCase(),
    accountName: account.login,
    selection: selection,
  });

  if (action === "deleted") {
    log.info(`😭 ${account.type} ${account.login} uninstalled`);
    return;
  }

  if (action === "removed") {
    log.info(
      `➖ ${account.type} ${account.login} removed ${pluralize(
        removed.length,
        "repository",
        "repositories",
      )}`,
    );
    return;
  }

  if (action === "created") {
    log.info(
      `🤗 ${account.type} ${account.login} installed on ${pluralize(
        repositories.length,
        "repository",
        "repositories",
      )}`,
    );

    return resetRepositories({
      app,
      context,
      account,
      repositories,
    });
  }

  if (action === "added") {
    log.info(
      `➕ ${account.type} ${account.login} added ${pluralize(
        added.length,
        "repository",
        "repositories",
      )}`,
    );

    return resetRepositories({
      app,
      context,
      account,
      repositories: added,
    });
  }

  if (action === "new_permissions_accepted") {
    log.info(`👌 ${account.type} ${account.login} accepted new permissions`);

    return resetRepositories({
      app,
      context,
      account,
      repositories: await context.octokit.paginate(
        context.octokit.apps.listReposAccessibleToInstallation,
        { per_page: 100 },
      ),
    });
  }

  log.info(`ℹ️ installation.${action} by ${account.login}`);
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
