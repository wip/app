import { createRequire } from "node:module";
import Stream from "stream";

import FakeTimers from "@sinonjs/fake-timers";
import { before, beforeEach, test } from "tap";
import nock from "nock";
import pino from "pino";

nock.disableNetConnect();

import { createTestApp } from "../helpers/setup.js";
import wip from "../../index.js";

const require = createRequire(import.meta.url);

let output;
const streamLogsToOutput = new Stream.Writable({ objectMode: true });
streamLogsToOutput._write = (object, encoding, done) => {
  output.push(JSON.parse(object));
  done();
};

before(function () {
  FakeTimers.install({ toFake: ["Date"] });
});

let app;
beforeEach(function () {
  output = [];
  delete process.env.APP_NAME;

  app = createTestApp();
  wip(app, pino(streamLogsToOutput));
});

test("purchase free", async function (t) {
  await app.webhooks.receive({
    id: "1",
    ...require("./events/purchase.json"),
  });

  t.equal(output[0].msg, "🆕🆓 Organization wip purchased Free");

  t.end();
});

test("purchase enterprise", async function (t) {
  await app.webhooks.receive({
    id: "1",
    ...require("./events/purchase-enterprise.json"),
  });

  t.equal(output[0].msg, "🆕💰 Organization wip purchased Enterprise");

  t.end();
});
test("upgrade", async function (t) {
  await app.webhooks.receive({
    id: "1",
    ...require("./events/upgrade.json"),
  });

  t.equal(output[0].msg, "⬆️💵 Organization wip changed to Pro");

  t.end();
});
test("upgrade", async function (t) {
  await app.webhooks.receive({
    id: "1",
    ...require("./events/downgrade.json"),
  });

  t.equal(output[0].msg, "⬇️💵 Organization wip changed to Pro");

  t.end();
});
test("cancellation", async function (t) {
  await app.webhooks.receive({
    id: "1",
    ...require("./events/cancellation.json"),
  });

  t.equal(output[0].msg, "🚫🆓 Organization wip cancelled Free");

  t.end();
});

test("pending_change", async function (t) {
  await app.webhooks.receive({
    id: "1",
    ...require("./events/upgrade-pending.json"),
  });

  t.equal(output.length, 0);

  t.end();
});
