FakeTimers = require("@sinonjs/fake-timers");
const { Application } = require("probot");
const simple = require("simple-mock");
const { beforeEach, test } = require("tap");

const plugin = require("../../");
const NOT_FOUND_ERROR = Object.assign(new Error("Not found"), { status: 404 });
const SERVER_ERROR = Object.assign(new Error("Ooops"), { status: 500 });

beforeEach(function (done) {
  FakeTimers.install();
  this.app = new Application();
  this.githubMock = {
    apps: {
      checkAccountIsAssociatedWithAny: simple
        .mock()
        .rejectWith(NOT_FOUND_ERROR),
    },
    checks: {
      listForRef: simple.mock().rejectWith(new Error('{"status": 403}')),
    },
    pullRequests: {
      listCommits: simple.mock().resolveWith({ data: [] }),
    },
    repos: {
      createStatus: simple.mock(),
      getCombinedStatusForRef: simple
        .mock()
        .resolveWith({ data: { statuses: [] } }),
    },
  };
  this.app.auth = () => Promise.resolve(this.githubMock);
  this.logMock = simple.mock();
  this.logMock.info = simple.mock();
  this.logMock.trace = simple.mock();
  this.logMock.warn = simple.mock();
  this.logMock.error = simple.mock().callFn(console.log);
  this.logMock.child = simple.mock().returnWith(this.logMock);
  this.app.log = this.logMock;
  this.app.load(plugin);
  done();
});

test('new pull request with "Test" title', async function (t) {
  await this.app.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  // check setting new status
  t.is(this.githubMock.repos.createStatus.callCount, 1);
  t.is(
    this.githubMock.repos.createStatus.lastCall.arg.target_url,
    "https://github.com/organizations/wip/settings/installations/1/permissions/update"
  );

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, "⛔ wip/app#1 (legacy)");
  t.is(this.logMock.child.lastCall.arg.legacy, true);

  t.end();
});

test('new pull request with "Test" title from user', async function (t) {
  await this.app.receive(
    require("./events/new-pull-request-with-test-title-from-user.json")
  );

  // check setting new status
  t.is(this.githubMock.repos.createStatus.callCount, 1);
  t.is(
    this.githubMock.repos.createStatus.lastCall.arg.target_url,
    "https://github.com/settings/installations/1/permissions/update"
  );

  // check resulting logs
  t.is(this.logMock.info.lastCall.arg, "⛔ wip/app#1 (legacy)");
  t.is(this.logMock.child.lastCall.arg.legacy, true);

  t.end();
});

test("request error", async function (t) {
  // simulate request error
  this.githubMock.repos.createStatus = simple.mock().rejectWith(SERVER_ERROR);
  this.logMock.error = simple.mock();

  await this.app.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  // check resulting logs
  t.same(this.logMock.error.lastCall.arg, SERVER_ERROR);

  t.end();
});
