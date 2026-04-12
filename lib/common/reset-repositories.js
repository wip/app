module.exports = resetRepositories;

const getPlan = require("../get-plan");
const handlePullRequestChange = require("../handle-pull-request-change");

async function resetRepositories({ app, octokit, log, account, repositories }) {
  const repositoryNames = repositories.map((repository) => repository.name);
  const owner = account.login;
  const plan = await getPlan(app, account);

  const promises = repositoryNames.map(async (repo) => {
    const pullRequests = await getPullRequests({ octokit, owner, repo });
    await Promise.all(
      pullRequests.map((pullRequest) => {
        return handlePullRequestChange({
          app: null,
          octokit,
          payload: {
            action: "opened",
            pull_request: pullRequest,
            repository: pullRequest.base.repo,
            installation: undefined,
            plan,
          },
          log,
        });
      }),
    );
  });

  await Promise.all(promises);
}

async function getPullRequests({ octokit, owner, repo }) {
  return octokit.paginate(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "open",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });
}
