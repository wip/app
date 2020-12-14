module.exports = handlePullRequestChange;

const getStatusFree = require("./free/get-status");
const setStatusFree = require("./free/set-status");

const getStatusPro = require("./pro/get-status");
const setStatusPro = require("./pro/set-status");

const getLogChild = require("./logs/get-child");
const getPlan = require("./get-plan");
const hasStatusChange = require("./common/has-status-change");

/**
 * @param {import('probot').Probot} app
 * @param {import('probot').Context} context
 */
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

    log = getLogChild({
      context,
      action,
      plan,
      newStatus,
      repo,
      hasChange,
      shortUrl,
      timeStart,
      number: pr.number,
    });

    // if status did not change then don’t call .createCommitStatus. Quotas for mutations
    // are much more restrictive so we want to avoid them if possible
    if (!hasChange) {
      return log.noUpdate();
    }

    // 3. Create check run
    const setStatus = plan === "free" ? setStatusFree : setStatusPro;
    await setStatus({ timeStart, ...newStatus }, context);

    log.stateChanged();
  } catch (error) {
    // ignore 404 errors coming from accounts that have been flagged as spam
    // by GitHub. API request to their account works, but accessing their account
    // on github.com fails.
    if (error.status === 404) {
      const accountName = repo.owner.login;
      const isSpam = await context.octokit
        .request(`HEAD https://github.com/${accountName}`)
        .then(
          () => false,
          () => true
        );

      if (isSpam) {
        context.log.info(
          {
            spam: true,
            account: repo.owner.id,
            accountType: repo.owner.type.toLowerCase(),
            accountName: repo.owner.login,
          },
          `SPAM: Ignoring 404 for account: ${accountName}`
        );
        return;
      }
    }

    throw error;
  }
}
