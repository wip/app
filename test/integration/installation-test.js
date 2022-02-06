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

test("uninstall", async function (t) {
  await this.probot.receive(require("./events/uninstall.json"));

  t.equal(output[0].msg, "😭 Organization wip uninstalled");
});

test("suspend", async function (t) {
  await this.probot.receive(require("./events/suspend.json"));

  t.equal(output[0].msg, "ℹ️ installation.suspend by wip");
});

test("repositories removed", async function (t) {
  await this.probot.receive(require("./events/repositories-removed.json"));

  t.equal(output[0].msg, "➖ Organization wip removed 2 repositories");
});

test("installation", async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    // https://docs.github.com/en/rest/reference/apps#get-a-subscription-plan-for-an-account
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // List pull requests
    // https://docs.github.com/en/rest/reference/pulls#list-pull-requests
    .get("/repos/wip/repo1/pulls")
    .query({
      state: "open",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    })
    .reply(200, [
      {
        title: "Test",
        number: 1,
        head: {
          sha: "sha123",
        },
        labels: [],
        base: {
          repo: {
            id: 1,
            name: "repo1",
            full_name: "wip/repo1",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
      {
        title: "[WIP] Test",
        number: 2,
        head: {
          sha: "sha456",
        },
        labels: [],
        base: {
          repo: {
            id: 1,
            name: "repo1",
            full_name: "wip/repo1",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
    ])

    // check for current status
    // https://docs.github.com/en/rest/reference/checks#list-check-runs-for-a-git-reference
    .get("/repos/wip/repo1/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // check for current status
    // https://docs.github.com/en/rest/reference/checks#list-check-runs-for-a-git-reference
    .get("/repos/wip/repo1/commits/sha456/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // Create 1st check run
    // https://docs.github.com/en/rest/reference/checks#create-a-check-run
    .post("/repos/wip/repo1/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha123",
        status: "completed",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: "Ready for review",
          summary: "No match found based on configuration",
          text: 'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.',
        },
        conclusion: "success",
        completed_at: "1970-01-01T00:00:00.000Z",
      });

      return true;
    })
    .reply(201, {})

    // create 2nd check run
    .post("/repos/wip/repo1/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha456",
        status: "in_progress",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: 'Title contains "WIP"',
          summary: 'The title "[WIP] Test" contains "WIP".',
          text: 'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.',
        },
      });

      return true;
    })
    .reply(201, {});

  await this.probot.receive(require("./events/install.json"));

  t.same(mock.activeMocks(), []);
});

test("repositories added", async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    // https://docs.github.com/en/rest/reference/apps#get-a-subscription-plan-for-an-account
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // List pull requests
    // https://docs.github.com/en/rest/reference/pulls#list-pull-requests
    .get("/repos/wip/repo1/pulls")
    .query({
      state: "open",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    })
    .reply(200, [
      {
        title: "Test",
        number: 1,
        head: {
          sha: "sha123",
        },
        labels: [],
        base: {
          repo: {
            id: 1,
            name: "repo1",
            full_name: "wip/repo1",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
      {
        title: "[WIP] Test",
        number: 2,
        head: {
          sha: "sha456",
        },
        labels: [],
        base: {
          repo: {
            id: 1,
            name: "repo1",
            full_name: "wip/repo1",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
    ])

    .get("/repos/wip/repo2/pulls")
    .query({
      state: "open",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    })
    .reply(200, [
      {
        title: "Test",
        number: 1,
        head: {
          sha: "sha789",
        },
        labels: [],
        base: {
          repo: {
            id: 2,
            name: "repo2",
            full_name: "wip/repo2",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
      {
        title: "[WIP] Test",
        number: 2,
        head: {
          sha: "sha100",
        },
        labels: [],
        base: {
          repo: {
            id: 2,
            name: "repo2",
            full_name: "wip/repo2",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
    ])

    // check for current status
    // https://docs.github.com/en/rest/reference/checks#list-check-runs-for-a-git-reference
    .get("/repos/wip/repo1/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // check for current check status & combined status (2nd pr)
    .get("/repos/wip/repo1/commits/sha456/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // check for current check status & combined status (3rd pr)
    .get("/repos/wip/repo2/commits/sha789/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // check for current check status & combined status (4th pr)
    .get("/repos/wip/repo2/commits/sha100/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // Create 1st check run
    // https://docs.github.com/en/rest/reference/checks#create-a-check-run
    .post("/repos/wip/repo1/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha123",
        status: "completed",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: "Ready for review",
          summary: "No match found based on configuration",
          text: 'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.',
        },
        conclusion: "success",
        completed_at: "1970-01-01T00:00:00.000Z",
      });

      return true;
    })
    .reply(201, {})

    // create 2nd check run
    .post("/repos/wip/repo1/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha456",
        status: "in_progress",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: 'Title contains "WIP"',
          summary: 'The title "[WIP] Test" contains "WIP".',
          text: 'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.',
        },
      });

      return true;
    })
    .reply(201, {})

    // create 3rd check run
    .post("/repos/wip/repo2/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha789",
        status: "completed",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: "Ready for review",
          summary: "No match found based on configuration",
          text: 'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.',
        },
        conclusion: "success",
        completed_at: "1970-01-01T00:00:00.000Z",
      });

      return true;
    })
    .reply(201, {})

    // create 4th check run
    .post("/repos/wip/repo2/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha100",
        status: "in_progress",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: 'Title contains "WIP"',
          summary: 'The title "[WIP] Test" contains "WIP".',
          text: 'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.',
        },
      });

      return true;
    })
    .reply(201, {});

  await this.probot
    .receive(require("./events/repositories-added.json"))
    .catch(t.error);

  t.same(mock.activeMocks(), []);
});

test("permissions accepted", async function (t) {
  const mock = nock("https://api.github.com")
    // has no plan
    // https://docs.github.com/en/rest/reference/apps#get-a-subscription-plan-for-an-account
    .get("/marketplace_listing/accounts/1")
    .reply(404)

    // List repositories accessible to the app installation
    // https://docs.github.com/en/rest/reference/apps#list-repositories-accessible-to-the-app-installation
    .get("/installation/repositories")
    .query({
      per_page: 100,
    })
    .reply(200, [
      {
        name: "repo1",
      },
    ])

    // List pull requests
    // https://docs.github.com/en/rest/reference/pulls#list-pull-requests
    .get("/repos/wip/repo1/pulls")
    .query({
      state: "open",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    })
    .reply(200, [
      {
        title: "Test",
        number: 1,
        head: {
          sha: "sha123",
        },
        labels: [],
        base: {
          repo: {
            id: 1,
            name: "repo1",
            full_name: "wip/repo1",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
      {
        title: "[WIP] Test",
        number: 2,
        head: {
          sha: "sha456",
        },
        labels: [],
        base: {
          repo: {
            id: 1,
            name: "repo1",
            full_name: "wip/repo1",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
    ])

    // check for current status
    // https://docs.github.com/en/rest/reference/checks#list-check-runs-for-a-git-reference
    .get("/repos/wip/repo1/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // 2nd pr
    .get("/repos/wip/repo1/commits/sha456/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // Create 1st check run
    // https://docs.github.com/en/rest/reference/checks#create-a-check-run
    .post("/repos/wip/repo1/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha123",
        status: "completed",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: "Ready for review",
          summary: "No match found based on configuration",
          text: 'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.',
        },
        conclusion: "success",
        completed_at: "1970-01-01T00:00:00.000Z",
      });

      return true;
    })
    .reply(201, {})

    // create 2nd check run
    .post("/repos/wip/repo1/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha456",
        status: "in_progress",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: 'Title contains "WIP"',
          summary: 'The title "[WIP] Test" contains "WIP".',
          text: 'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://p5js.org/download/support.html) – one of the most diverse and impactful Open Source community there is.',
        },
      });

      return true;
    })
    .reply(201, {});

  await this.probot
    .receive(require("./events/new-permissions-accepted.json"))
    .catch(t.error);

  t.same(mock.activeMocks(), []);
});

test("installation for pro plan", async function (t) {
  const mock = nock("https://api.github.com")
    // has pro plan
    // https://docs.github.com/en/rest/reference/apps#get-a-subscription-plan-for-an-account
    .get("/marketplace_listing/accounts/1")
    .reply(200, {
      marketplace_purchase: {
        plan: {
          price_model: "FLAT_RATE",
        },
      },
    })

    // List pull requests
    // https://docs.github.com/en/rest/reference/pulls#list-pull-requests
    .get("/repos/wip/repo1/pulls")
    .query({
      state: "open",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    })
    .reply(200, [
      {
        title: "Test",
        number: 1,
        head: {
          sha: "sha123",
        },
        labels: [],
        base: {
          repo: {
            id: 1,
            name: "repo1",
            full_name: "wip/repo1",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
      {
        title: "[WIP] Test",
        number: 2,
        head: {
          sha: "sha456",
        },
        labels: [],
        base: {
          repo: {
            id: 1,
            name: "repo1",
            full_name: "wip/repo1",
            private: false,
            owner: {
              id: 1,
              login: "wip",
              type: "Organization",
            },
          },
        },
      },
    ])

    // List commits on first pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/repo1/pulls/1/commits")
    .reply(200, [])

    // check for current status
    // https://docs.github.com/en/rest/reference/checks#list-check-runs-for-a-git-reference
    .get("/repos/wip/repo1/commits/sha123/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // check for current status
    // https://docs.github.com/en/rest/reference/checks#list-check-runs-for-a-git-reference
    .get("/repos/wip/repo1/commits/sha456/check-runs")
    .query({
      check_name: "WIP",
    })
    .reply(200, { check_runs: [] })

    // Create 1st check run
    // https://docs.github.com/en/rest/reference/checks#create-a-check-run
    .post("/repos/wip/repo1/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha123",
        status: "completed",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: "Ready for review",
          summary: "No match found based on configuration.",
          text: "`.github/wip.yml` does not exist, the default configuration is applied:\n\n```yaml\nterms:\n- wip\n- work in progress\n- 🚧\nlocations: title\n```\n\nRead more about [WIP configuration](https://github.com/wip/app#configuration)",
        },
        conclusion: "success",
        completed_at: "1970-01-01T00:00:00.000Z",
      });

      return true;
    })
    .reply(201, {})

    // List commits on 2nd pull request
    // https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    .get("/repos/wip/repo1/pulls/2/commits")
    .reply(200, [])

    // create 2nd check run
    .post("/repos/wip/repo1/check-runs", (createCheckParams) => {
      t.strictSame(createCheckParams, {
        name: "WIP",
        head_branch: "",
        head_sha: "sha456",
        status: "in_progress",
        started_at: "1970-01-01T00:00:00.000Z",
        output: {
          title: 'Title contains "WIP"',
          summary:
            'The title "[WIP] Test" contains "WIP".\n\n  You can override the status by adding "@wip ready for review" to the end of the [pull request description](undefined#discussion_bucket).',
          text: "`.github/wip.yml` does not exist, the default configuration is applied:\n\n```yaml\nterms:\n- wip\n- work in progress\n- 🚧\nlocations: title\n```\n\nRead more about [WIP configuration](https://github.com/wip/app#configuration)",
        },
      });

      return true;
    })
    .reply(201, {});

  await this.probot.receive(require("./events/install.json")).catch(t.error);

  t.same(mock.activeMocks(), []);
});
