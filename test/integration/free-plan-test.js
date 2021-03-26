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
  // Clear log output
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

test('new pull request with "Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.name, "WIP");
      t.equal(createCheckParams.status, "completed");
      t.equal(createCheckParams.started_at, "1970-01-01T00:00:00.000Z");
      t.equal(createCheckParams.completed_at, "1970-01-01T00:00:00.000Z");
      t.equal(createCheckParams.status, "completed");
      t.equal(createCheckParams.conclusion, "success");
      t.equal(createCheckParams.output.title, "Ready for review");
      t.match(
        createCheckParams.output.summary,
        /No match found based on configuration/
      );
      t.match(
        createCheckParams.output.text,
        /WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧"/
      );
      t.match(
        createCheckParams.output.text,
        /You can configure both the terms and the location that the WIP app will look for by signing up for the pro plan/
      );
      t.match(createCheckParams.output.text, /All revenue will be donated/i);
      t.equal(createCheckParams.actions, undefined);

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('new pull request with "[WIP] Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "in_progress");
      t.equal(createCheckParams.output.title, 'Title contains "WIP"');
      t.match(
        createCheckParams.output.summary,
        /The title "\[WIP\] Test" contains "WIP"/
      );
      t.notMatch(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('new pull request with "[Work in Progress] Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "in_progress");
      t.equal(
        createCheckParams.output.title,
        'Title contains "Work in Progress"'
      );
      t.match(
        createCheckParams.output.summary,
        /The title "\[Work in Progress\] Test" contains "Work in Progress"/
      );
      t.notMatch(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-work-in-progress-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('new pull request with "🚧 Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "in_progress");
      t.equal(
        createCheckParams.output.title,
        "Title contains a construction emoji"
      );
      t.match(
        createCheckParams.output.summary,
        /The title "🚧 Test" contains "🚧"/
      );
      t.notMatch(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-emoji-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('new pull request with "🚧Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "in_progress");
      t.equal(
        createCheckParams.output.title,
        "Title contains a construction emoji"
      );
      t.match(
        createCheckParams.output.summary,
        /The title "🚧Test" contains "🚧"/
      );
      t.notMatch(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-emoji-no-space-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('pending pull request with "Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, {
      check_runs: [
        {
          status: "pending",
        },
      ],
    })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "completed");
      t.equal(createCheckParams.conclusion, "success");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('ready pull request with "[WIP] Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, {
      check_runs: [
        {
          conclusion: "success",
        },
      ],
    })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "in_progress");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('pending pull request with "[WIP] Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, {
      check_runs: [
        {
          status: "pending",
        },
      ],
    });

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('ready pull request with "Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, {
      check_runs: [
        {
          conclusion: "success",
        },
      ],
    });

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test('active marketplace "free" plan', async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FREE",
        },
      },
    })

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, {
      check_runs: [],
    })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "completed");
      t.equal(createCheckParams.conclusion, "success");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test("request error", async function (t) {
  t.plan(4);

  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(500);

  await this.probot
    .receive(require("./events/new-pull-request-with-test-title.json"))
    .catch((error) => {
      t.equal(error.name, "AggregateError");

      const errors = Array.from(error);
      t.equal(errors.length, 1);
      t.equal(errors[0].status, 500);
    });

  t.same(mock.activeMocks(), []);
});

test("Create check error", async function (t) {
  t.plan(4);

  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, {
      check_runs: [],
    })

    // create new check run
    .post("/repos/wip/app/check-runs")
    .reply(500);

  await this.probot
    .receive(require("./events/new-pull-request-with-test-title.json"))
    .catch((error) => {
      t.equal(error.name, "AggregateError");

      const errors = Array.from(error);
      t.equal(errors.length, 1);
      t.equal(errors[0].status, 500);
    });

  t.same(mock.activeMocks(), []);
});

test("custom APP_NAME", async function (t) {
  process.env.APP_NAME = "WIP (local-dev)";

  const mock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP (local-dev)",
    })
    .reply(200, {
      check_runs: [],
    })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.name, "WIP (local-dev)");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test("404 from hasStatusChange check (spam)", async function (t) {
  const apiMock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(404);

  const dotcomMock = nock("https://github.com").head("/wip").reply(404);

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-title.json")
  );

  t.same(apiMock.activeMocks(), []);
  t.same(dotcomMock.activeMocks(), []);
});

test("404 from hasStatusChange check (not spam)", async function (t) {
  const apiMock = nock("https://api.github.com")
    // has no plan
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(404);

  const dotcomMock = nock("https://github.com").head("/wip").reply(200);

  try {
    await this.probot.receive(
      require("./events/new-pull-request-with-wip-title.json")
    );
    throw new Error("Should not resolve");
  } catch (error) {
    const errors = Array.from(error);
    t.equal(errors.length, 1);
    t.equal(errors[0].status, 404);
  }

  t.same(apiMock.activeMocks(), []);
  t.same(dotcomMock.activeMocks(), []);
});
