const Stream = require("stream");

const FakeTimers = require("@sinonjs/fake-timers");
const { beforeEach, test } = require("tap");
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

beforeEach(function () {
  output = [];
  delete process.env.APP_NAME;

  FakeTimers.install({ toFake: ["Date"] });

  this.probot = new Probot({
    id: 1,
    githubToken: "test",
    Octokit: ProbotOctokit.defaults({
      throttle: { enabled: false },
      retry: { enabled: false },
      log: pino(streamLogsToOutput),
    }),
    log: pino(streamLogsToOutput),
  });

  this.probot.load(app);
});

test("purchase free", async function (t) {
  await this.probot.receive(require("./events/purchase.json"));

  t.equal(output[0].msg, "🆕🆓 Organization wip purchased Free");

  t.end();
});

test("purchase enterprise", async function (t) {
  await this.probot.receive(require("./events/purchase-enterprise.json"));

  t.equal(output[0].msg, "🆕💰 Organization wip purchased Enterprise");

  t.end();
});
test("upgrade", async function (t) {
  await this.probot.receive(require("./events/upgrade.json"));

  t.equal(output[0].msg, "⬆️💵 Organization wip changed to Pro");

  t.end();
});
test("upgrade", async function (t) {
  await this.probot.receive(require("./events/downgrade.json"));

  t.equal(output[0].msg, "⬇️💵 Organization wip changed to Pro");

  t.end();
});
test("cancellation", async function (t) {
  await this.probot.receive(require("./events/cancellation.json"));

  t.equal(output[0].msg, "🚫🆓 Organization wip cancelled Free");

  t.end();
});

test("pending_change", async function (t) {
  await this.probot.receive(require("./events/upgrade-pending.json"));

  t.equal(output.length, 0);

  t.end();
});
