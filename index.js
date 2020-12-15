module.exports = wip;

const handlePullRequestChange = require("./lib/handle-pull-request-change");
const handleMarketplacePurchase = require("./lib/handle-marketplace-purchase");
const handleInstallation = require("./lib/handle-installation");

/**
 * @param {import('probot').Probot} app
 */
function wip(app) {
  // listen to all relevant pull request event actions
  app.on(
    [
      "pull_request.opened",
      "pull_request.edited",
      "pull_request.labeled",
      "pull_request.unlabeled",
      "pull_request.synchronize",
    ],
    handlePullRequestChange.bind(null, app)
  );

  // listen to relevant marketplace purchase events
  app.on(
    [
      "marketplace_purchase.purchased",
      "marketplace_purchase.changed",
      "marketplace_purchase.cancelled",
    ],
    handleMarketplacePurchase.bind(null, app)
  );

  // listen to installation events
  app.on(
    ["installation", "installation_repositories"],
    handleInstallation.bind(null, app)
  );
}
