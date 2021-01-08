module.exports = handleMarketplacePurchase;

const getConfig = require("./app-config");

/**
 * log purchased, cancelled and changed events
 *
 * @param {import('probot').Probot} app
 * @param {import('probot').Context} context
 */
function handleMarketplacePurchase(app, context) {
  const {
    action,
    marketplace_purchase: { account, plan },
    previous_marketplace_purchase: previous,
  } = context.payload;
  const log = context.log.child({
    name: getConfig().name,
    event: context.name,
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

  log.info(
    `${changeEmoji}${planEmoji} ${account.type} ${account.login} ${
      action === "changed" ? "changed to" : action
    } ${plan.name}`
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
