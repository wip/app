import getStatusFree from "./free/get-status.js";
import setStatusFree from "./free/set-status.js";

import getStatusPro from "./pro/get-status.js";
import setStatusPro from "./pro/set-status.js";

import getLogChild from "./logs/get-child.js";
import getPlan from "./get-plan.js";
import {
  getExistingCheckRuns,
  hasStatusChange,
} from "./common/has-status-change.js";

/**
 * @param {object} options
 * @param {import('octokit').App} options.app
 * @param {import('octokit').Octokit} options.octokit
 * @param {object} options.payload
 * @param {import('pino').Logger} options.log
 */
export default async function handlePullRequestChange({
  app,
  octokit,
  payload,
  log,
}) {
  const { action, pull_request: pr, repository: repo } = payload;
  const timeStart = Date.now();

  try {
    // 1. Fetch plan and existing check runs in parallel to reduce latency.
    //    A plan can be passed in for installs when all PRs are handled at once.
    const [plan, checkRuns] = await Promise.all([
      payload.plan || getPlan(app, repo.owner),
      getExistingCheckRuns({ octokit, payload }),
    ]);

    const newStatus =
      plan === "free"
        ? await getStatusFree({ payload })
        : await getStatusPro({ octokit, payload });
    const shortUrl = `${repo.full_name}#${pr.number}`;

    // 2. if status did not change then don't create a new check run. Quotas for
    //    mutations are more restrictive so we want to avoid them if possible
    const hasChange = hasStatusChange(newStatus, checkRuns);

    log = getLogChild({
      log,
      eventName: "pull_request",
      action,
      plan,
      newStatus,
      repo,
      hasChange,
      shortUrl,
      timeStart,
      number: pr.number,
    });

    // if status did not change then don't call .createCommitStatus. Quotas for mutations
    // are much more restrictive so we want to avoid them if possible
    if (!hasChange) {
      return log.noUpdate();
    }

    // 3. Create check run
    const setStatus = plan === "free" ? setStatusFree : setStatusPro;
    await setStatus({ timeStart, ...newStatus }, { octokit, payload });

    log.stateChanged();
  } catch (error) {
    // ignore 404 errors coming from accounts that have been flagged as spam
    // by GitHub. API request to their account works, but accessing their account
    // on github.com fails.
    if (error.status === 404) {
      const accountName = repo.owner.login;
      const isSpam = await octokit
        .request(`HEAD https://github.com/${accountName}`)
        .then(
          () => false,
          () => true,
        );

      if (isSpam) {
        log.info(
          {
            spam: true,
            account: repo.owner.id,
            accountType: repo.owner.type.toLowerCase(),
            accountName: repo.owner.login,
          },
          `SPAM: Ignoring 404 for account: ${accountName}`,
        );
        return;
      }
    }

    throw error;
  }
}
