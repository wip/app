import { beforeEach, afterEach, test } from "tap";
import getPlan from "../../lib/get-plan.js";

beforeEach((t) => {
  // Preserve GHE_HOST value before removal
  t.GHE_HOST = process.env.GHE_HOST;
  delete process.env.GHE_HOST;
});

afterEach((t) => {
  // Restore initial GHE_HOST value
  process.env.GHE_HOST = t.GHE_HOST;
});

test('returns "pro" if account is enabled manually', async function (t) {
  const app = {};
  const owner = { login: "resistbot" };
  const plan = await getPlan(app, owner);

  t.equal(plan, "pro");
  t.end();
});

test('returns "pro" for GitHub Enterprise Server installations', async function (t) {
  const app = {};
  const owner = { login: "foo" };

  process.env.GHE_HOST = true;
  const plan = await getPlan(app, owner);

  t.equal(plan, "pro");
  t.end();
});

test("throws error if getting current plan fails with error other than 404", async function (t) {
  const app = {
    octokit: {
      rest: {
        apps: {
          getSubscriptionPlanForAccount() {
            throw new Error("oops");
          },
        },
      },
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
