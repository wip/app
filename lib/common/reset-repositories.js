module.exports = resetRepositories;

const getPlan = require("../get-plan");
const handlePullRequestChange = require("../handle-pull-request-change");

async function resetRepositories(
  { app, context, account, repositories },
  repo
) {
  const repositoryNames = repositories.map((repository) => repository.name);
  const owner = account.login;
  const plan = await getPlan(app, account);

  const promises = repositoryNames.map(async (repo) => {
    const pullRequests = await getPullRequests({ context, owner, repo });
    await Promise.all(
      pullRequests.map((pullRequest) => {
        const event = toEvent({ context, plan, owner, repo, pullRequest });
        return handlePullRequestChange(null, event);
      })
    );
  });

  await Promise.all(promises);
}

async function getPullRequests({ context, owner, repo }) {
  return context.octokit.paginate(context.octokit.pulls.list, {
    owner,
    repo,
    state: "open",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });
}

function toEvent({ context, plan, owner, repo, pullRequest }) {
  return {
    event: "pull_request",
    plan,
    octokit: context.octokit,
    async config() {
      // TODO make loading configuration work
    },
    log: context.log,
    repo(options) {
      return Object.assign(
        {
          owner,
          repo,
        },
        options
      );
    },
    payload: {
      action: "opened",
      pull_request: pullRequest,
      repository: pullRequest.base.repo,
      installation: context.payload.installation,
    },
  };
}
