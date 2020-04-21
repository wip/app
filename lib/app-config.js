module.exports = appConfig;

function appConfig() {
  return {
    // the app name appears in the list of pull request checks. We make it
    // configurable so we can deploy multiple versions that can be used side-by-side
    name: process.env.APP_NAME || "WIP",
  };
}
