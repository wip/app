const { test } = require("tap");

const getConfig = require("../../lib/pro/get-config");
const getConfigFromRepo = require("../../lib/utils/get-config-from-repo");

test("throws error if getting config fails with error other than 404", async function (t) {
  try {
    await getConfig({
      octokit: {
        request() {
          throw Object.assign(new Error("oops"), { status: 500 });
        },
      },
      payload: {
        repository: {
          name: "app",
          owner: { login: "wip" },
        },
      },
    });
    t.fail("should throw error");
  } catch (error) {
    t.equal(error.message, "oops");
  }

  t.end();
});
