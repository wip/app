module.exports = { getExistingCheckRuns, hasStatusChange };

const getAppConfig = require("../app-config");
const getRepo = require("../utils/get-repo");

async function getExistingCheckRuns({ octokit, payload }) {
  const { name } = getAppConfig();

  const {
    data: { check_runs: checkRuns },
  } = await octokit.rest.checks.listForRef(
    getRepo(payload, {
      ref: payload.pull_request.head.sha,
      check_name: name,
    }),
  );

  return checkRuns;
}

function hasStatusChange(newStatus, checkRuns) {
  if (checkRuns.length === 0) return true;

  const [{ conclusion, output }] = checkRuns;
  const isWip = conclusion !== "success";
  const hasOverride = output && /override/.test(output.title);

  return isWip !== newStatus.wip || hasOverride !== newStatus.override;
}
