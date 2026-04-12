import yaml from "js-yaml";

export default async function getConfigFromRepo(octokit, payload) {
  const { owner, name: repo } = payload.repository;

  // Try the repo itself first
  let content = await fetchYaml(octokit, owner.login, repo, ".github/wip.yml");

  // Fall back to the org's .github repo
  if (content === null) {
    content = await fetchYaml(
      octokit,
      owner.login,
      ".github",
      ".github/wip.yml",
    );
  }

  return content;
}

async function fetchYaml(octokit, owner, repo, path) {
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        mediaType: { format: "raw" },
      },
    );

    return yaml.load(data);
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}
