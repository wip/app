const Stream = require("stream");

const { beforeEach, test, expectUncaughtException } = require("tap");
const pino = require("pino");

const { Probot, ProbotOctokit } = require("probot");

const app = require("../../");

let output;
const streamLogsToOutput = new Stream.Writable({ objectMode: true });
streamLogsToOutput._write = (object, encoding, done) => {
  output.push(JSON.parse(object));
  done();
};

beforeEach(function (done) {
  // Clear log output
  output = [];
  delete process.env.APP_NAME;

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

test("logs event with action", async function (t) {
  await this.probot.receive({
    name: "check_run",
    id: "event123",
    payload: {
      action: "completed",
      installation: {
        id: 1,
        account: {
          login: "wip",
        },
      },
    },
  });

  t.equal(output.length, 1);
  delete output[0].pid;
  delete output[0].hostname;
  delete output[0].time;
  t.deepEqual(output[0], {
    level: 30,
    name: "event",
    id: "event123",
    event: "check_run",
    action: "completed",
    installation: 1,
    owner: "wip",
    isEventStat: true,
    msg: "check_run.completed event received for wip (id: event123)",
  });
});

test("logs event without action", async function (t) {
  await this.probot.receive({
    name: "ping",
    id: "event123",
    payload: {
      installation: {
        id: 1,
        account: {
          login: "wip",
        },
      },
    },
  });

  t.equal(output.length, 1);
  delete output[0].pid;
  delete output[0].hostname;
  delete output[0].time;
  t.deepEqual(output[0], {
    level: 30,
    name: "event",
    id: "event123",
    event: "ping",
    installation: 1,
    owner: "wip",
    isEventStat: true,
    msg: "ping event received for wip (id: event123)",
  });
});
