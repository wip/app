const lolex = require("lolex");
const { Application } = require("probot");
const simple = require("simple-mock");
const { beforeEach, test } = require("tap");

const plugin = require("../../");

const NOT_FOUND_ERROR = Object.assign(new Error("Not found"), { status: 404 });

beforeEach(function (done) {
  delete process.env.APP_NAME;

  lolex.install();
  this.app = new Application();
  this.githubMock = {
    paginate: simple.mock().returnWith([]),
    apps: {
      checkAccountIsAssociatedWithAny: simple
        .mock()
        .rejectWith(NOT_FOUND_ERROR),
      listRepos: {
        endpoint: { merge: simple.mock() },
      },
    },
    pulls: {
      list: {
        endpoint: { merge: simple.mock() },
      },
    },
    checks: {
      create: simple.mock(),
      listForRef: simple.mock().resolveWith({
        data: {
          check_runs: [],
        },
      }),
    },
    repos: {
      getCombinedStatusForRef: simple
        .mock()
        .resolveWith({ data: { statuses: [] } }),
    },
  };
  this.app.auth = () => Promise.resolve(this.githubMock);
  this.logMock = simple.mock();
  this.logMock.debug = simple.mock();
  this.logMock.trace = simple.mock();
  this.logMock.info = simple.mock();
  this.logMock.warn = simple.mock();
  this.logMock.error = simple.mock().callFn(console.log);
  this.logMock.child = simple.mock().returnWith(this.logMock);
  this.app.log = this.logMock;
  this.app.load(plugin);
  done();
});

test("cancellation", async function (t) {
  await this.app.receive(require("./events/uninstall.json"));

  t.is(this.logMock.info.lastCall.arg, "😭 Organization wip uninstalled");

  t.end();
});

test("repositories removed", async function (t) {
  await this.app.receive(require("./events/repositories-removed.json"));

  t.is(
    this.logMock.info.lastCall.arg,
    "➖ Organization wip removed 2 repositories"
  );

  t.end();
});

test("installation", async function (t) {
  this.githubMock.paginate = simple.mock().resolveWith([
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
          },
        },
      },
    },
  ]);

  await this.app.receive(require("./events/install.json"));

  // one repository × two pull requests
  t.is(this.githubMock.checks.create.callCount, 2);

  const [one, two] = this.githubMock.checks.create.calls;

  t.deepEqual(one.arg, {
    owner: "wip",
    repo: "repo1",
    name: "WIP",
    head_branch: "",
    head_sha: "sha123",
    status: "completed",
    started_at: "1970-01-01T00:00:00.000Z",
    output: {
      title: "Ready for review",
      summary: "No match found based on configuration",
      text:
        'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://donorbox.org/supportpf2019-fundraising-campaign) – one of the most diverse and impactful Open Source community there is.',
    },
    conclusion: "success",
    completed_at: "1970-01-01T00:00:00.000Z",
    request: {
      retries: 3,
      retryAfter: 3,
    },
  });

  t.deepEqual(two.arg, {
    owner: "wip",
    repo: "repo1",
    name: "WIP",
    head_branch: "",
    head_sha: "sha456",
    status: "in_progress",
    started_at: "1970-01-01T00:00:00.000Z",
    output: {
      title: 'Title contains "WIP"',
      summary: 'The title "[WIP] Test" contains "WIP".',
      text:
        'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://donorbox.org/supportpf2019-fundraising-campaign) – one of the most diverse and impactful Open Source community there is.',
    },
    request: {
      retries: 3,
      retryAfter: 3,
    },
  });

  t.end();
});

test("repositories added", async function (t) {
  this.githubMock.paginate = simple
    .mock()
    .resolveWith([
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
            },
          },
        },
      },
    ])
    .resolveWith([
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
            },
          },
        },
      },
    ]);

  await this.app.receive(require("./events/repositories-added.json"));

  // two repositories × two pull requests
  t.is(this.githubMock.checks.create.callCount, 4);

  const [one, two, three, four] = this.githubMock.checks.create.calls;

  t.deepEqual(one.arg, {
    owner: "wip",
    repo: "repo1",
    name: "WIP",
    head_branch: "",
    head_sha: "sha123",
    status: "completed",
    started_at: "1970-01-01T00:00:00.000Z",
    output: {
      title: "Ready for review",
      summary: "No match found based on configuration",
      text:
        'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://donorbox.org/supportpf2019-fundraising-campaign) – one of the most diverse and impactful Open Source community there is.',
    },
    conclusion: "success",
    completed_at: "1970-01-01T00:00:00.000Z",
    request: {
      retries: 3,
      retryAfter: 3,
    },
  });

  t.deepEqual(two.arg, {
    owner: "wip",
    repo: "repo1",
    name: "WIP",
    head_branch: "",
    head_sha: "sha456",
    status: "in_progress",
    started_at: "1970-01-01T00:00:00.000Z",
    output: {
      title: 'Title contains "WIP"',
      summary: 'The title "[WIP] Test" contains "WIP".',
      text:
        'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://donorbox.org/supportpf2019-fundraising-campaign) – one of the most diverse and impactful Open Source community there is.',
    },
    request: {
      retries: 3,
      retryAfter: 3,
    },
  });

  t.deepEqual(three.arg, {
    owner: "wip",
    repo: "repo2",
    name: "WIP",
    head_branch: "",
    head_sha: "sha789",
    status: "completed",
    started_at: "1970-01-01T00:00:00.000Z",
    output: {
      title: "Ready for review",
      summary: "No match found based on configuration",
      text:
        'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://donorbox.org/supportpf2019-fundraising-campaign) – one of the most diverse and impactful Open Source community there is.',
    },
    conclusion: "success",
    completed_at: "1970-01-01T00:00:00.000Z",
    request: {
      retries: 3,
      retryAfter: 3,
    },
  });

  t.deepEqual(four.arg, {
    owner: "wip",
    repo: "repo2",
    name: "WIP",
    head_branch: "",
    head_sha: "sha100",
    status: "in_progress",
    started_at: "1970-01-01T00:00:00.000Z",
    output: {
      title: 'Title contains "WIP"',
      summary: 'The title "[WIP] Test" contains "WIP".',
      text:
        'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://donorbox.org/supportpf2019-fundraising-campaign) – one of the most diverse and impactful Open Source community there is.',
    },
    request: {
      retries: 3,
      retryAfter: 3,
    },
  });

  t.end();
});

test("permissions accepted", async function (t) {
  this.githubMock.paginate = simple
    .mock()
    // repos
    .resolveWith([
      {
        name: "repo1",
      },
    ])
    // pull requsets
    .resolveWith([
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
            },
          },
        },
      },
    ]);

  await this.app.receive(require("./events/new-permissions-accepted.json"));

  // one repository × two pull requests
  t.is(this.githubMock.checks.create.callCount, 2);

  const [one, two] = this.githubMock.checks.create.calls;

  t.deepEqual(one.arg, {
    owner: "wip",
    repo: "repo1",
    name: "WIP",
    head_branch: "",
    head_sha: "sha123",
    status: "completed",
    started_at: "1970-01-01T00:00:00.000Z",
    output: {
      title: "Ready for review",
      summary: "No match found based on configuration",
      text:
        'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://donorbox.org/supportpf2019-fundraising-campaign) – one of the most diverse and impactful Open Source community there is.',
    },
    conclusion: "success",
    completed_at: "1970-01-01T00:00:00.000Z",
    request: {
      retries: 3,
      retryAfter: 3,
    },
  });

  t.deepEqual(two.arg, {
    owner: "wip",
    repo: "repo1",
    name: "WIP",
    head_branch: "",
    head_sha: "sha456",
    status: "in_progress",
    started_at: "1970-01-01T00:00:00.000Z",
    output: {
      title: 'Title contains "WIP"',
      summary: 'The title "[WIP] Test" contains "WIP".',
      text:
        'By default, WIP only checks the pull request title for the terms "WIP", "Work in progress" and "🚧".\n\nYou can configure both the terms and the location that the WIP app will look for by signing up for the pro plan: https://github.com/marketplace/wip. All revenue will be donated to [Processing | p5.js](https://donorbox.org/supportpf2019-fundraising-campaign) – one of the most diverse and impactful Open Source community there is.',
    },
    request: {
      retries: 3,
      retryAfter: 3,
    },
  });

  t.end();
});
