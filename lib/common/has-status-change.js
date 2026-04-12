import getAppConfig from "../app-config.js";
import getRepo from "../utils/get-repo.js";

export async function getExistingCheckRuns({ octokit, payload }) {
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

export function hasStatusChange(newStatus, checkRuns) {
  if (checkRuns.length === 0) return true;

  const [{ conclusion, output }] = checkRuns;
  const isWip = conclusion !== "success";
  const hasOverride = output && /override/.test(output.title);

  return isWip !== newStatus.wip || hasOverride !== newStatus.override;
}
