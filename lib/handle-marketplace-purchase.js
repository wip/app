module.exports = handleMarketplacePurchase;

const getConfig = require("./app-config");

/**
 * log purchased, cancelled and changed events
 *
 * @param {object} options
 * @param {import('octokit').Octokit} options.octokit
 * @param {object} options.payload
 * @param {import('pino').Logger} options.log
 * @param {string} options.eventName
 */
function handleMarketplacePurchase({ octokit, payload, log, eventName }) {
  const {
    action,
    marketplace_purchase: { account, plan },
    previous_marketplace_purchase: previous,
  } = payload;
  const childLog = log.child({
    name: getConfig().name,
    event: eventName,
    action,
    account: account.id,
    accountType: account.type.toLowerCase(),
    accountName: account.login,
    plan: plan.name,
    change: !!previous,
  });

  const changeEmoji = getChangeEmoji(action, plan, previous);
  const planEmoji =
    plan.name === "Free" ? "🆓" : plan.name === "Pro" ? "💵" : "💰";

  childLog.info(
    `${changeEmoji}${planEmoji} ${account.type} ${account.login} ${
      action === "changed" ? "changed to" : action
    } ${plan.name}`,
  );
}

function getChangeEmoji(action, plan, previous) {
  if (action === "purchased") {
    return "🆕";
  }
  if (action === "cancelled") {
    return "🚫";
  }

  return plan.monthly_price_in_cents > previous.plan.monthly_price_in_cents
    ? "⬆️"
    : "⬇️";
}
