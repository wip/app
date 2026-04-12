import { test } from "tap";

test("smoke test", async (t) => {
  await import("../../index.js");
  t.end();
});
