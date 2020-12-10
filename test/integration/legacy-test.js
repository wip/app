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

beforeEach(function (done) {
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

  done();
});

test('new pull request with "Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // no access to check runs
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(403)

    // Create a commit status
    // https://docs.github.com/en/rest/reference/repos#create-a-commit-status
    .post("/repos/wip/app/statuses/sha123", (createCommitStatusParams) => {
      t.strictDeepEqual(createCommitStatusParams, {
        state: "error",
        target_url:
          "https://github.com/organizations/wip/settings/installations/1/permissions/update",
        description: "Please accept the new permissions",
        context: "WIP",
      });

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
});

test('new pull request with "Test" title from user', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // no access to check runs
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(403)

    // Create a commit status
    // https://docs.github.com/en/rest/reference/repos#create-a-commit-status
    .post("/repos/wip/app/statuses/sha123", (createCommitStatusParams) => {
      t.strictDeepEqual(createCommitStatusParams, {
        state: "error",
        target_url:
          "https://github.com/settings/installations/1/permissions/update",
        description: "Please accept the new permissions",
        context: "WIP",
      });

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title-from-user.json")
  );

  t.deepEqual(mock.activeMocks(), []);
});

test("request error", async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // no access to check runs
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(403)

    // Create a commit status
    // https://docs.github.com/en/rest/reference/repos#create-a-commit-status
    .post("/repos/wip/app/statuses/sha123")
    .reply(500);

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title-from-user.json")
  );

  t.deepEqual(mock.activeMocks(), []);
});
