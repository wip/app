module.exports = getStatusFree;

const matchTerms = require("../common/match-terms");

async function getStatusFree({ payload }) {
  const title = payload.pull_request.title;
  const match = matchTerms(["wip", "work in progress", "🚧"], title);

  if (!match) {
    return {
      wip: false,
    };
  }

  return {
    wip: true,
    location: "title",
    text: title,
    match,
  };
}
