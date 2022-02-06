module.exports = setStatusPro;

const getAppConfig = require("../app-config");
const PRO_PLAN_FOR_FREE = require("../../pro-plan-for-free");

const locationLabel = {
  title: "title",
  label_name: "label",
  commit_subject: "commit subject",
};

async function setStatusPro(newStatus, context) {
  const { repository, pull_request: pullRequest } = context.payload;
  const { name } = getAppConfig();

  const { emojiToName } = await import("gemoji");

  let output = emojiToName[newStatus.match];

  if (output === undefined) {
    output = `"${newStatus.match}"`; // Text match
  } else {
    output = `a ${output} emoji`; // Emoji match
  }

  let location = locationLabel[newStatus.location];

  if (location !== undefined) {
    location = location.charAt(0).toUpperCase() + location.slice(1); // Make first letter of word capitalize
  }

  const checkOptions = {
    name: name,
    status: "in_progress",
    started_at: new Date(newStatus.timeStart).toISOString(),
    head_branch: "", // workaround for https://github.com/octokit/rest.js/issues/874
    head_sha: pullRequest.head.sha,
    output: {
      title: `${location} contains ${output}`,
      summary: `The ${locationLabel[newStatus.location]} "${
        newStatus.text
      }" contains "${newStatus.match}".

  You can override the status by adding "@wip ready for review" to the end of the [pull request description](${
    pullRequest.html_url
  }#discussion_bucket).`,
      text: `\`.github/wip.yml\` does not exist, the default configuration is applied:

\`\`\`yaml
terms:
- wip
- work in progress
- 🚧
locations: title
\`\`\`

Read more about [WIP configuration](https://github.com/wip/app#configuration)`,
    },
    // workaround random "Bad Credentials" errors
    // https://github.community/t5/GitHub-API-Development-and/Random-401-errors-after-using-freshly-generated-installation/m-p/22905/highlight/true#M1596
    request: {
      retries: 3,
      retryAfter: 3,
    },
  };

  if (!newStatus.wip) {
    checkOptions.status = "completed";
    checkOptions.conclusion = "success";
    checkOptions.completed_at = new Date().toISOString();
    checkOptions.output.title = "Ready for review";
    checkOptions.output.summary = "No match found based on configuration.";
  }

  if (newStatus.override) {
    checkOptions.output.title += " (override)";
    checkOptions.output.summary =
      "The status has been set to success by adding `@wip ready for review` to the pull request comment. You can reset the status by removing it.";
  } else if (newStatus.hasCustomConfig) {
    checkOptions.output.text = `The following configuration was applied:

<table>
  <thead>
    <th>
      terms
    </th>
    <th>
      locations
    </th>
  </thead>
  ${newStatus.config
    .map(
      (config) =>
        `<tr><td>${config.terms.join(", ")}</td><td>${config.locations.join(
          ", "
        )}</td></tr>`
    )
    .join("\n")}
</table>`;
  }

  /* istanbul ignore next */
  if (PRO_PLAN_FOR_FREE.includes(repository.owner.login.toLowerCase())) {
    checkOptions.output.summary += `
  ### 🆓💸 The account ${repository.owner.login} is [enabled for the pro plan for free](https://github.com/wip/app/blob/master/pro-plan-for-free.js)

  Please consider [signing up for the pro plan](https://github.com/marketplace/wip), all revenue is donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.`;
  }

  return context.octokit.checks.create(context.repo(checkOptions));
}
