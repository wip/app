module.exports = overwriteCommitStatus;

const getConfig = require("../app-config");

// Check if a commit status has been set by the previous WIP app and overwrite
// it to prevent a pull request being blocked indefinitely. Resolves with true
// if commit status was overwritten, otherwise false. See #124
async function overwriteCommitStatus(context) {
  const {
    pull_request: {
      head: { sha },
    },
  } = context.payload;
  const {
    data: { statuses },
  } = await context.octokit.repos.getCombinedStatusForRef(
    context.repo({
      ref: sha,
    })
  );

  const wipStatus = statuses.find(
    (status) => status.context === getConfig().name
  );

  if (!wipStatus) {
    return;
  }

  // don’t overwrite if it already is
  if (/legacy/i.test(wipStatus.description)) {
    return;
  }

  await context.octokit.repos.createCommitStatus(
    context.repo({
      sha,
      state: "success",
      target_url: "https://github.com/wip/app/issues/124",
      description: "Legacy commit status override — see details",
      context: getConfig().name,
    })
  );

  return true;
}
