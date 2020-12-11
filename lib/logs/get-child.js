module.exports = getChildLog;

const getConfig = require("../app-config");

function getChildLog({
  context,
  action,
  plan,
  newStatus,
  repo,
  hasChange,
  shortUrl,
  timeStart,
  number,
}) {
  const options = {
    name: getConfig().name,
    event: context.name,
    action,
    account: repo.owner.id,
    accountType: repo.owner.type.toLowerCase(),
    accountName: repo.owner.login,
    plan,
    repo: repo.id,
    private: repo.private,
    change: hasChange,
    wip: newStatus.wip,
    location: newStatus.location,
    match: newStatus.match,
    pr: number,
  };
  if (plan === "pro") {
    options.hasConfig = !!newStatus.hasCustomConfig;
    options.override = newStatus.override;
  }
  const log = context.log.child(options);

  return {
    noUpdate() {
      log.info(getDuration(timeStart), `😐 ${shortUrl}`);
    },
    stateChanged() {
      const logStatus = newStatus.override
        ? "❗️"
        : newStatus.wip
        ? "⏳"
        : "✅";
      let message = `${logStatus} ${shortUrl}`;
      if (newStatus.wip) {
        message += ` - "${newStatus.match}" found in ${newStatus.location}`;
      }
      log.info(getDuration(timeStart), message);
    },
  };
}

function getDuration(timeStart) {
  return {
    duration: Date.now() - timeStart,
  };
}
