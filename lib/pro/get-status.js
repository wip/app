import getConfig from "./get-config.js";
import matchTerms from "../common/match-terms.js";
import getRepo from "../utils/get-repo.js";

export default async function getStatusPro({ octokit, payload }) {
  const { pull_request: pr } = payload;
  const labelNames = pr.labels.map((label) => label.name);
  const body = pr.body;

  if (/@wip ready for review/i.test(body)) {
    return {
      wip: false,
      override: true,
    };
  }

  const { config, hasCustomConfig } = await getConfig({ octokit, payload });

  const state = {
    commitSubjects: [],
  };

  for (var i = 0; i < config.length; i++) {
    const matchText = matchTermsAndLocations.bind(
      null,
      config[i].terms,
      config[i].locations,
    );
    const titleMatch = matchText("title", pr.title);
    const [labelMatch] = labelNames
      .map(matchText.bind(null, "label_name"))
      .filter(Boolean);
    const [commitMatch] = (await getCommitSubjects(state, { octokit, payload }))
      .map(matchText.bind(null, "commit_subject"))
      .filter(Boolean);
    const bodyMatch = pr.body ? matchText("body", pr.body) : null;
    const match = titleMatch || labelMatch || commitMatch || bodyMatch;

    if (match) {
      return {
        wip: true,
        config,
        hasCustomConfig,
        ...match,
      };
    }
  }

  return {
    wip: false,
    config,
    hasCustomConfig,
  };
}

async function getCommitSubjects(state, { octokit, payload }) {
  if (state.commitSubjects.length) {
    return state.commitSubjects;
  }

  const { data: commits } = await octokit.rest.pulls.listCommits(
    getRepo(payload, {
      pull_number: payload.pull_request.number,
    }),
  );

  state.commitSubjects = commits.map(
    (element) => element.commit.message.split("\n")[0],
  );

  return state.commitSubjects;
}

function matchTermsAndLocations(terms, locations, location, text) {
  if (!locations.includes(location)) {
    return null;
  }

  const match = matchTerms(terms, text);
  return match ? { location, text, match } : null;
}
