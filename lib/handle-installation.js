module.exports = handleInstallation;

const pluralize = require("pluralize");

const getConfig = require("./app-config");
const resetRepositories = require("./common/reset-repositories");

// On install or accepted permissions, update all PRs for installs
// On uninstall, just log
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
    event: context.event,
    action,
    account: account.id,
    accountType: account.type.toLowerCase(),
    selection: selection,
  });

  if (action === "deleted") {
    log.info(`😭 ${account.type} ${account.login} uninstalled`);
    return;
  }

  if (action === "removed") {
    log.info(
      `➖ ${account.type} ${account.login} removed ${pluralize(
        "repository",
        removed.length,
        true
      )}`
    );
    return;
  }

  if (action === "created") {
    log.info(
      `🤗 ${account.type} ${account.login} installed on ${pluralize(
        "repository",
        repositories.length,
        true
      )}`
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
        "repository",
        added.length,
        true
      )}`
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

    const options = context.octokit.apps.listRepos.endpoint.merge({
      per_page: 100,
    });

    return resetRepositories({
      app,
      context,
      account,
      repositories: await context.octokit.paginate(options),
    });
  }

  log.info(`ℹ️ installation.${action} by ${account.login}`);
}
