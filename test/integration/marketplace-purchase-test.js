const FakeTimers = require("@sinonjs/fake-timers");
const { beforeEach, test } = require("tap");
const nock = require("nock");
const simple = require("simple-mock");

nock.disableNetConnect();

// disable Probot logs, bust be set before requiring probot
process.env.LOG_LEVEL = "fatal";
const { Probot, ProbotOctokitCore } = require("probot");

const app = require("../../");

beforeEach(function (done) {
  delete process.env.APP_NAME;
  process.env.DISABLE_STATS = "true";
  process.env.DISABLE_WEBHOOK_EVENT_CHECK = "true";
  process.env.WIP_DISABLE_MEMORY_USAGE = "true";

  FakeTimers.install({ toFake: ["Date"] });

  this.probot = new Probot({
    id: 1,
    githubToken: "test",
    Octokit: ProbotOctokitCore,
  });

  this.probot.logger.info = simple.mock();
  this.probot.logger.child = simple.mock().returnWith(this.probot.logger);

  this.probot.load(app);

  done();
});

test("purchase free", async function (t) {
  await this.probot.receive(require("./events/purchase.json"));

  t.is(
    this.probot.logger.info.lastCall.arg,
    "🆕🆓 Organization wip purchased Free"
  );

  t.end();
});

test("purchase enterprise", async function (t) {
  await this.probot.receive(require("./events/purchase-enterprise.json"));

  t.is(
    this.probot.logger.info.lastCall.arg,
    "🆕💰 Organization wip purchased Enterprise"
  );

  t.end();
});
test("upgrade", async function (t) {
  await this.probot.receive(require("./events/upgrade.json"));

  t.is(
    this.probot.logger.info.lastCall.arg,
    "⬆️💵 Organization wip changed to Pro"
  );

  t.end();
});
test("upgrade", async function (t) {
  await this.probot.receive(require("./events/downgrade.json"));

  t.is(
    this.probot.logger.info.lastCall.arg,
    "⬇️💵 Organization wip changed to Pro"
  );

  t.end();
});
test("cancellation", async function (t) {
  await this.probot.receive(require("./events/cancellation.json"));

  t.is(
    this.probot.logger.info.lastCall.arg,
    "🚫🆓 Organization wip cancelled Free"
  );

  t.end();
});

test("pending_change", async function (t) {
  await this.probot.receive(require("./events/upgrade-pending.json"));

  t.is(this.probot.logger.info.callCount, 0);

  t.end();
});
