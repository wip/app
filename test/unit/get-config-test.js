const { test } = require("tap");

const getConfig = require("../../lib/pro/get-config");

test("throws error if getting config fails with error other than 404", async function (t) {
  try {
    await getConfig({
      config() {
        throw new Error("oops");
      },
    });
    t.fail("should throw error");
  } catch (error) {
    t.equal(error.message, "oops");
  }

  t.end();
});
