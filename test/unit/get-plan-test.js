const proxyquire = require("proxyquire").noCallThru();
const { beforeEach, afterEach, test } = require("tap");

beforeEach((t) => {
  // Preserve GHE_HOST value before removal
  t.context.GHE_HOST = process.env.GHE_HOST;
  delete process.env.GHE_HOST;
});

afterEach((t) => {
  // Restore initial GHE_HOST value
  process.env.GHE_HOST = t.context.GHE_HOST;
});

test('returns "pro" if account is enabled manually', async function (t) {
  const getPlan = proxyquire("../../lib/get-plan", {
    "../pro-plan-for-free": ["foo"],
  });
  const app = {};
  const owner = { login: "foo" };
  const plan = await getPlan(app, owner);

  t.equal(plan, "pro");
  t.end();
});

test('returns "pro" for GitHub Enterprise Server installations', async function (t) {
  const getPlan = require("../../lib/get-plan");
  const app = {};
  const owner = { login: "foo" };

  process.env.GHE_HOST = true;
  const plan = await getPlan(app, owner);

  t.equal(plan, "pro");
  t.end();
});

test("throws error if getting current plan fails with error other than 404", async function (t) {
  const getPlan = require("../../lib/get-plan");
  const app = {
    auth() {
      return {
        apps: {
          getSubscriptionPlanForAccount() {
            throw new Error("oops");
          },
        },
      };
    },
  };
  const owner = { login: "foo" };
  try {
    await getPlan(app, owner);
    t.fail("should throw error");
  } catch (error) {
    t.equal(error.message, "oops");
  }

  t.end();
});
