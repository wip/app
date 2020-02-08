module.exports = handlePullRequestChange;

const getStatusFree = require("./free/get-status");
const setStatusFree = require("./free/set-status");

const getStatusPro = require("./pro/get-status");
const setStatusPro = require("./pro/set-status");

const getLogChild = require("./logs/get-child");
const getPlan = require("./get-plan");
const hasStatusChange = require("./common/has-status-change");
const legacyHandler = require("./legacy/handle-pull-request-change");
const overwriteLegacyCommitStatus = require("./legacy/overwrite-commit-status");

async function handlePullRequestChange(app, context) {
  const { action, pull_request: pr, repository: repo } = context.payload;
  const timeStart = Date.now();
  let log = context.log;

  try {
    // 1. get new status based on marketplace plan. A plan can be passed in
    //    in case of an install, when all pull reuqests are handled at once.
    const plan = context.plan || (await getPlan(app, repo.owner));
    const newStatus =
      plan === "free"
        ? await getStatusFree(context)
        : await getStatusPro(context);
    const shortUrl = `${repo.full_name}#${pr.number}`;

    // 2. if status did not change then don’t create a new check run. Quotas for
    //    mutations are more restrictive so we want to avoid them if possible
    const hasChange = await hasStatusChange(newStatus, context);

    // Override commit status set in previous WIP app. Unfortunately, when setting
    // a pull request state using a check that has the same context name as a
    // commit status, one does not override the other, instead they are both listed.
    // That means that a previous "pending" commit status can block a pull pull_request
    // indefinitely, hence the override. See https://github.com/wip/app/issues/89#notes-on-update-to-marketplace-version
    const didLegacyOveride = await overwriteLegacyCommitStatus(context);

    log = getLogChild({
      context,
      action,
      plan,
      newStatus,
      repo,
      hasChange,
      shortUrl,
      didLegacyOveride,
      timeStart
    });

    // if status did not change then don’t call .createStatus. Quotas for mutations
    // are much more restrictive so we want to avoid them if possible
    if (!hasChange) {
      return log.noUpdate();
    }

    // 3. Create check run
    const setStatus = plan === "free" ? setStatusFree : setStatusPro;
    await setStatus({ timeStart, ...newStatus }, context);

    log.stateChanged();
  } catch (error) {
    try {
      // workaround for https://github.com/octokit/rest.js/issues/684
      const parsed = JSON.parse(error.message);
      for (const key in parsed) {
        error[key] = parsed[key];
      }
    } catch (e) {}

    // Error code 403 (Resource not accessible by integration) means that
    // the user did not yet accept the new permissions, so we handle it the
    // old school way
    if (error.status === 403) {
      return legacyHandler(context);
    }

    log.error(error);
  }
}
