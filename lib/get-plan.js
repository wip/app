module.exports = getPlan

// Find out if user as pro plan or not. The request to check the installation
// for the current account (user account_id or organization) needs to be
// authenticated as the app, not installation. If the app has no plan it means
// that it wasn’t installed from the marketplace but from github.com/app/wip.
// We treat it these as "FREE".
//
// The plan can be overwritten to "Pro" by adding an account name to pro-plan-for-free.js

const PRO_PLAN_FOR_FREE = require('../pro-plan-for-free')

async function getPlan (robot, owner) {
  if (PRO_PLAN_FOR_FREE.includes(owner.login)) {
    return 'pro'
  }

  const authenticatedAsApp = await robot.auth()
  try {
    const {
      data: {
        marketplace_purchase: { plan }
      }
    } = await authenticatedAsApp.apps.checkAccountIsAssociatedWithAny({
      account_id: owner.id
    })

    return plan.price_model === 'FREE' ? 'free' : 'pro'
  } catch (error) {
    if (error.status === 404) {
      return 'free'
    }

    throw error
  }
}
