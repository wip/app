module.exports = wip;

const handlePullRequestChange = require("./lib/handle-pull-request-change");
const handleInstallation = require("./lib/handle-installation");
const logEvent = require("./lib/log-event");

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

  // listen to installation events
  app.on(
    ["installation", "installation_repositories"],
    handleInstallation.bind(null, app)
  );

  // Log all events
  app.on("*", logEvent);
}
