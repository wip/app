const FakeTimers = require("@sinonjs/fake-timers");
const { beforeEach, test } = require("tap");
const nock = require("nock");
nock.disableNetConnect();

// disable Probot logs, bust be set before requiring probot
process.env.LOG_LEVEL = "fatal";
const { Probot } = require("probot");

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
    throttleOptions: { enabled: false },
  });
  this.probot.load(app);

  done();
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.name, "WIP");
      t.is(createCheckParams.status, "completed");
      t.is(createCheckParams.started_at, "1970-01-01T00:00:00.000Z");
      t.is(createCheckParams.completed_at, "1970-01-01T00:00:00.000Z");
      t.is(createCheckParams.status, "completed");
      t.is(createCheckParams.conclusion, "success");
      t.is(createCheckParams.output.title, "Ready for review");
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
      t.is(createCheckParams.actions, undefined);

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.status, "in_progress");
      t.is(createCheckParams.output.title, 'Title contains "WIP"');
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

  t.deepEqual(mock.activeMocks(), []);
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.status, "in_progress");
      t.is(createCheckParams.output.title, 'Title contains "Work in Progress"');
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

  t.deepEqual(mock.activeMocks(), []);
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.status, "in_progress");
      t.is(
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

  t.deepEqual(mock.activeMocks(), []);
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.status, "in_progress");
      t.is(
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

  t.deepEqual(mock.activeMocks(), []);
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.status, "completed");
      t.is(createCheckParams.conclusion, "success");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.status, "in_progress");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
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
    })

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] });

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
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
    })

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] });

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.status, "completed");
      t.is(createCheckParams.conclusion, "success");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
});

test("request error", async function (t) {
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

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
});

test("Create check error", async function (t) {
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs")
    .reply(500);

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, { statuses: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.name, "WIP (local-dev)");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
});

test("Legacy commit status override (#124)", async function (t) {
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, {
      statuses: [
        {
          context: "WIP",
          state: "pending",
          description: "Pending — work in progress",
        },
      ],
    })

    // Create a commit status
    // https://docs.github.com/en/rest/reference/repos#create-a-commit-status
    .post("/repos/wip/app/statuses/sha123", (createCommitStatusParams) => {
      t.strictDeepEqual(createCommitStatusParams, {
        state: "success",
        target_url: "https://github.com/wip/app/issues/124",
        description: "Legacy commit status override — see details",
        context: "WIP",
      });

      return true;
    })
    .reply(201, {})

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.is(createCheckParams.status, "completed");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
});

test("Legacy commit status override - has overide (#124)", async function (t) {
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

    // get combined status
    // https://docs.github.com/en/rest/reference/repos#get-the-combined-status-for-a-specific-reference
    .get("/repos/wip/app/commits/sha123/status")
    .reply(200, {
      statuses: [
        {
          context: "WIP",
          state: "success",
          description: "Legacy Commit Status Override — see details",
        },
      ],
    });

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.deepEqual(mock.activeMocks(), []);
});
