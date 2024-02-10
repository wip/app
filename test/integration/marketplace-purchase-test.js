const Stream = require("stream");

const FakeTimers = require("@sinonjs/fake-timers");
const { before, beforeEach, test } = require("tap");
const nock = require("nock");
const pino = require("pino");

nock.disableNetConnect();

const { Probot, ProbotOctokit } = require("probot");

const app = require("../../");

let output;
const streamLogsToOutput = new Stream.Writable({ objectMode: true });
streamLogsToOutput._write = (object, encoding, done) => {
  output.push(JSON.parse(object));
  done();
};

before(function () {
  FakeTimers.install({ toFake: ["Date"] });
});

let probot;
beforeEach(function () {
  output = [];
  delete process.env.APP_NAME;

  probot = new Probot({
    id: 1,
    githubToken: "test",
    Octokit: ProbotOctokit.defaults((instanceOptions) => {
      return {
        ...instanceOptions,
        throttle: { enabled: false },
        retry: { enabled: false },
        log: pino(streamLogsToOutput),
      };
    }),
    log: pino(streamLogsToOutput),
  });

  probot.load(app);
});

test("purchase free", async function (t) {
  await probot.receive(require("./events/purchase.json"));

  t.equal(output[0].msg, "🆕🆓 Organization wip purchased Free");

  t.end();
});

test("purchase enterprise", async function (t) {
  await probot.receive(require("./events/purchase-enterprise.json"));

  t.equal(output[0].msg, "🆕💰 Organization wip purchased Enterprise");

  t.end();
});
test("upgrade", async function (t) {
  await probot.receive(require("./events/upgrade.json"));

  t.equal(output[0].msg, "⬆️💵 Organization wip changed to Pro");

  t.end();
});
test("upgrade", async function (t) {
  await probot.receive(require("./events/downgrade.json"));

  t.equal(output[0].msg, "⬇️💵 Organization wip changed to Pro");

  t.end();
});
test("cancellation", async function (t) {
  await probot.receive(require("./events/cancellation.json"));

  t.equal(output[0].msg, "🚫🆓 Organization wip cancelled Free");

  t.end();
});

test("pending_change", async function (t) {
  await probot.receive(require("./events/upgrade-pending.json"));

  t.equal(output.length, 0);

  t.end();
});
