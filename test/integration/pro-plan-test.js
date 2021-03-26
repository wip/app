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

test('new pull request with "Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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
        /the default configuration is applied/
      );

      return true;
    })
    .reply(201, {});

  await this.probot
    .receive(require("./events/new-pull-request-with-test-title.json"))
    .catch(t.error);

  t.equal(output[0].msg, "✅ wip/app#1");
  t.equal(output.length, 1);

  delete output[0].pid;
  delete output[0].hostname;
  t.same(output[0], {
    level: 30,
    time: 0,
    name: "WIP",
    event: "pull_request",
    action: "opened",
    account: 1,
    accountName: "wip",
    accountType: "organization",
    plan: "pro",
    repo: 1,
    private: false,
    change: true,
    wip: false,
    hasConfig: false,
    duration: 0,
    msg: "✅ wip/app#1",
    pr: 1,
  });

  t.same(mock.activeMocks(), []);
});

test('new pull request with "[WIP] Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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
      t.match(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-title.json")
  );

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.wip, true);
  t.equal(logParams.change, true);
  t.equal(logParams.location, "title");
  t.equal(logParams.match, "WIP");

  t.same(mock.activeMocks(), []);
});

test('pending pull request with "Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.wip, false);
  t.equal(logParams.change, true);

  t.same(mock.activeMocks(), []);
});

test('ready pull request with "[WIP] Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.wip, true);
  t.equal(logParams.change, true);

  t.same(mock.activeMocks(), []);
});

test('pending pull request with "[WIP] Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.wip, true);
  t.equal(logParams.change, false);

  t.same(mock.activeMocks(), []);
});

test('ready pull request with "Test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.wip, false);
  t.equal(logParams.change, false);

  t.same(mock.activeMocks(), []);
});

test("custom term: 🚧", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(200, "terms: 🚧")

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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
      t.equal(createCheckParams.name, "WIP");
      t.equal(createCheckParams.status, "in_progress");
      t.equal(createCheckParams.completed_at, undefined);
      t.equal(createCheckParams.status, "in_progress");
      t.equal(
        createCheckParams.output.title,
        "Title contains a construction emoji"
      );
      t.match(
        createCheckParams.output.summary,
        /The title "🚧 Test" contains "🚧"/
      );
      t.match(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );
      t.match(createCheckParams.output.text, /<td>🚧<\/td>/);

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-emoji-title.json")
  );

  // check resulting logs
  t.equal(output[0].msg, '⏳ wip/app#1 - "🚧" found in title');
  t.equal(output.length, 1);

  delete output[0].pid;
  delete output[0].hostname;
  t.same(output[0], {
    level: 30,
    time: 0,
    name: "WIP",
    event: "pull_request",
    action: "opened",
    account: 1,
    accountName: "wip",
    accountType: "organization",
    plan: "pro",
    repo: 1,
    private: false,
    change: true,
    wip: true,
    location: "title",
    match: "🚧",
    hasConfig: true,
    duration: 0,
    msg: '⏳ wip/app#1 - "🚧" found in title',
    pr: 1,
  });

  t.same(mock.activeMocks(), []);
});

test("custom term: 🚧NoSpace", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(200, "terms: 🚧")

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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
      t.equal(createCheckParams.name, "WIP");
      t.equal(createCheckParams.status, "in_progress");
      t.equal(createCheckParams.completed_at, undefined);
      t.equal(createCheckParams.status, "in_progress");
      t.equal(
        createCheckParams.output.title,
        "Title contains a construction emoji"
      );
      t.match(
        createCheckParams.output.summary,
        /The title "🚧Test" contains "🚧"/
      );
      t.match(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );
      t.match(createCheckParams.output.text, /<td>🚧<\/td>/);
      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-emoji-no-space-title.json")
  );

  // check resulting logs
  t.equal(output[0].msg, '⏳ wip/app#1 - "🚧" found in title');
  t.equal(output.length, 1);

  delete output[0].pid;
  delete output[0].hostname;
  t.same(output[0], {
    level: 30,
    time: 0,
    name: "WIP",
    event: "pull_request",
    action: "opened",
    account: 1,
    accountName: "wip",
    accountType: "organization",
    plan: "pro",
    repo: 1,
    private: false,
    change: true,
    wip: true,
    location: "title",
    match: "🚧",
    hasConfig: true,
    duration: 0,
    msg: '⏳ wip/app#1 - "🚧" found in title',
    pr: 1,
  });

  t.same(mock.activeMocks(), []);
});

test("custom location: label_name", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(200, "locations: label_name")

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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
      t.match(
        createCheckParams.output.summary,
        /The label "WIP" contains "WIP"/
      );
      t.match(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );
      t.equal(createCheckParams.output.title, 'Label contains "WIP"');
      t.match(createCheckParams.output.text, /<td>label_name<\/td>/);

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-label.json")
  );

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.location, "label_name");
  t.equal(logParams.match, "WIP");

  t.same(mock.activeMocks(), []);
});

test("custom location: commits", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(200, "locations: commit_subject")

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [
      {
        commit: {
          message: "WIP: test",
        },
      },
    ])

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
      t.match(
        createCheckParams.output.summary,
        /The commit subject "WIP: test" contains "WIP"/
      );
      t.match(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );
      t.match(createCheckParams.output.text, /<td>commit_subject<\/td>/);

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-label.json")
  );

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.location, "commit_subject");
  t.equal(logParams.match, "WIP");

  t.same(mock.activeMocks(), []);
});

test("complex config", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(
      200,
      `
- terms:
  - 🚧
  - WIP
  locations:
  - title
  - label_name
- terms:
  - fixup!
  - squash!
  locations: commit_subject`
    )

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [
      {
        commit: {
          message: "fixup! test",
        },
      },
      {
        commit: {
          message: "test",
        },
      },
    ])

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
      t.match(
        createCheckParams.output.summary,
        /The commit subject "fixup! test" contains "fixup!"/
      );
      t.match(
        createCheckParams.output.summary,
        /You can override the status by adding "@wip ready for review"/
      );
      t.match(createCheckParams.output.text, /<td>commit_subject<\/td>/);

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.location, "commit_subject");
  t.equal(logParams.match, "fixup!");

  t.same(mock.activeMocks(), []);
});

test("loads config from .github repository", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has config in .github repository
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(200, "terms: 🚧")

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

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
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-emoji-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test("loads commits once only", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has config in .github repository
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(
      200,
      `
- terms: 'foo'
  locations: commit_subject
- terms: 'bar'
  locations: commit_subject`
    )

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [
      {
        commit: {
          message: "test",
        },
      },
    ])

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
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.same(mock.activeMocks(), []);
});

test("override", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "completed");
      t.equal(createCheckParams.conclusion, "success");
      t.equal(createCheckParams.output.title, "Ready for review (override)");
      t.match(
        createCheckParams.output.summary,
        /The status has been set to success by adding `@wip ready for review` to the pull request comment/
      );

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-wip-title-and-override.json")
  );

  // check resulting logs
  t.equal(output[0].msg, "❗️ wip/app#1");
  const logParams = output[0];
  t.equal(logParams.wip, false);
  t.equal(logParams.override, true);
  t.equal(logParams.change, true);

  t.same(mock.activeMocks(), []);
});

test("pending pull request with override", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, {
      check_runs: [
        {
          status: "in_progress",
          output: {
            title: "Ready for review (override)",
          },
        },
      ],
    })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.status, "completed");
      t.equal(createCheckParams.conclusion, "success");
      t.equal(createCheckParams.output.title, "Ready for review");
      t.match(
        createCheckParams.output.summary,
        /No match found based on configuration/
      );

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  // check resulting logs
  const logParams = output[0];
  t.equal(logParams.wip, false);
  t.equal(logParams.change, true);

  t.same(mock.activeMocks(), []);
});

test('pending pull request with override and "[WIP] test" title', async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, {
      check_runs: [
        {
          status: "in_progress",
          output: {
            title: "Ready for review (override)",
          },
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

  // check resulting logs
  const logParams = output[0];

  t.equal(logParams.wip, true);
  t.equal(logParams.change, true);

  t.same(mock.activeMocks(), []);
});

test("custom APP_NAME", async function (t) {
  process.env.APP_NAME = "WIP (local-dev)";

  const mock = nock("https://api.github.com")
    // has pro plan
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // has no config
    .get("/repos/wip/app/contents/.github%2Fwip.yml")
    .reply(404)
    .get("/repos/wip/.github/contents/.github%2Fwip.yml")
    .reply(404)

    // List commits on a pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/app/pulls/1/commits")
    .reply(200, [])

    // check for current status
    .get("/repos/wip/app/commits/sha123/check-runs")
    .query({
      check_name: "WIP (local-dev)",
    })
    .reply(200, { check_runs: [] })

    // create new check run
    .post("/repos/wip/app/check-runs", (createCheckParams) => {
      t.equal(createCheckParams.name, "WIP (local-dev)");

      return true;
    })
    .reply(201, {});

  await this.probot.receive(
    require("./events/new-pull-request-with-test-title.json")
  );

  t.equal(output[0].name, "WIP (local-dev)");

  t.same(mock.activeMocks(), []);
});
