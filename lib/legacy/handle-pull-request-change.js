module.exports = handlePullRequestChange;

const getConfig = require("../app-config");

async function handlePullRequestChange(context) {
  const {
    action,
    pull_request: pr,
    repository: repo,
    installation,
    organization,
  } = context.payload;
  const newStatus = "error";
  const shortUrl = `${repo.full_name}#${pr.number}`;

  const log = context.log.child({
    name: getConfig().name,
    event: context.event,
    action,
    account: repo.owner.id,
    repo: repo.id,
    legacy: true,
  });

  const isOrg = !!organization;
  const targetUrl = isOrg
    ? `https://github.com/organizations/${organization.login}/settings/installations/${installation.id}/permissions/update`
    : `https://github.com/settings/installations/${installation.id}/permissions/update`;

  try {
    await context.github.repos.createCommitStatus(
      context.repo({
        sha: pr.head.sha,
        state: newStatus,
        target_url: targetUrl,
        description: "Please accept the new permissions",
        context: getConfig().name,
      })
    );

    log.info(`⛔ ${shortUrl} (legacy)`);
  } catch (error) {
    log.error(error);
  }
}
