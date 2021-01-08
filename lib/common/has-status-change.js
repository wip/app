module.exports = hasStatusChange;

const getAppConfig = require("../app-config");

async function hasStatusChange(newStatus, context) {
  const { name } = getAppConfig();

  const {
    data: { check_runs: checkRuns },
  } = await context.octokit.checks.listForRef(
    context.repo({
      ref: context.payload.pull_request.head.sha,
      check_name: name,
    })
  );

  if (checkRuns.length === 0) return true;

  const [{ conclusion, output }] = checkRuns;
  const isWip = conclusion !== "success";
  const hasOverride = output && /override/.test(output.title);

  return isWip !== newStatus.wip || hasOverride !== newStatus.override;
}
