module.exports = wip;

const handlePullRequestChange = require("./lib/handle-pull-request-change");
const handleMarketplacePurchase = require("./lib/handle-marketplace-purchase");
const handleInstallation = require("./lib/handle-installation");

/**
 * @param {import('octokit').App} app
 * @param {import('pino').Logger} log
 */
function wip(app, log) {
  // listen to all relevant pull request event actions
  app.webhooks.on(
    [
      "pull_request.opened",
      "pull_request.edited",
      "pull_request.labeled",
      "pull_request.unlabeled",
      "pull_request.synchronize",
    ],
    ({ octokit, payload }) =>
      handlePullRequestChange({ app, octokit, payload, log }),
  );

  // listen to relevant marketplace purchase events
  app.webhooks.on(
    [
      "marketplace_purchase.purchased",
      "marketplace_purchase.changed",
      "marketplace_purchase.cancelled",
    ],
    ({ octokit, payload }) =>
      handleMarketplacePurchase({
        octokit,
        payload,
        log,
        eventName: "marketplace_purchase",
      }),
  );

  // listen to installation events
  app.webhooks.on(
    ["installation", "installation_repositories"],
    ({ octokit, payload, name }) =>
      handleInstallation({
        app,
        octokit,
        payload,
        log,
        eventName: name,
      }),
  );
}
