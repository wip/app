const pino = require("pino");
const { App, Octokit } = require("octokit");

// Test RSA private key - only used for signing test JWTs, not a real secret
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC87qKa8tzYBH4q
r0NJPYLGypZuhaa1o7evkbdOYXFrcmciYHUxtBI9ncqSktUpgrxZLNrYs0lJIJw0
xYp3RWxoUqKzUTblwPgr8A0NrvgvuNVmZy3dw/cL7bCHgHpWX5mhYcd7ITLUSDYh
KUi37wedGvSAjXiukRWYltvjeM8UGMJ0PViX19FapdwLFjnfSTT4Y/5aQNfTQEuZ
gzkA6fQbVsLGmaO9f2cwQlUq9dSq6+aV5fYzANlyMb/DpZ8jrCSJajQF7OoNNZ41
KlSrlVu/42Jq2pPt8dknYCavQ7dmb4VTYI9sUBG0jZKI3XcpcSAOkHPF1ofnHP3U
m0+g20C1AgMBAAECggEAAR3fG719T2L6RMi/H2wOJpw27YxyibtNomuFkKCIrCeM
vFx+lx6LkDKrWA9wQdB7XF4kkv8s2u25MzSmRIIPd1Ri2afDTYR70wc61s6muisy
Jf0Da1DsRdC0ep5D2thozvq85nTotIBb59SzIvl2NGpxJ/I3QlFzo7m+069veC8A
GFd5bO9qwznNsL8BfsqI72vdb69Wa7YwNLM2r4zqa3ICcXHkYqg3USfLSzT+86Fi
7OSva21lY3HVwdu8TN7E8/Ik47KRR67laOy6Nm1r9Gm3kgSgYgDhVf38jCRJ9suY
J7gsx5sP3IN+EA2G4b4b05D9nFvC7gpb94BHCB+JwQKBgQD0I6uxBVpggipDDqxv
gBEndUNBRszQxKqRwv3WQRb6Lri1hrjGN84vDfbqpSOlRrTt2BlBlZlk+gkEV4Sv
mfkjsiZKygWZDkMJMAAT/ddQjazxHv+PYYwcpWtDbrvYJhcz9EUp8PQojnB4iMwm
06bfnOFeNUu5BXOjCRA+bTgs1QKBgQDGHFwumE5W+gC6R+h5c+wvJuyfWagq/uMy
5tAwWOT7Smp7UU/dfV01hzINenESOpdgmWzDpYD5RYxAUnQCKWZErP+qRV+Q1441
BsYVnlvWh1qRAVQGolDuHIh5zYCsixTMX2h8JO83XfYC7wOetVeKub9M8WZQ4Ia/
Y8ONLxs0YQKBgHgAFIM1Y1/uewFs8/r2Uvg3HjC2sTOoh0KQOp6WbcnZLzcimi3r
/i+IyKY7N5Mkdwg1YOyosLY+ZDI7Jl/96cTO6x11wVyi8vZQHqm06qGQkcIO/4Sl
aO4nrNp/UluDFYKW/WwJIKnSoZvNebNX8z0Uan4Y6jhuYpFvggl9O9BlAoGBAMXV
KkSpeYmnjDR5fHBUT6Xig+a5HJMbB30cOwgcrUU30c+lqlBvUTYT9Oq6u9FNSz9+
1rslOf8y8VSGQiyqdOLds02wizdT2kGfqw2JnwJDFjC5l9QsIQ821R51Fiq3lKRm
HiviojOzE+loD0BcrLfut1c5tUfMfyL+mBgT02HhAoGAKoX7K8HnDODmw2rQ4ew7
vQ0Cq2FMot5P1l1Xr5MdXIrcu03X6RggfkzjnIN5deDs94/H/VZW9KBmjvWR2JJJ
ZTZs/eyldV8vm0OyP+QyYhgFOXI+w9nChloQsC4cqrg19ZZcrSd1xdH5M2e2A4Cr
nVPxR1Bl4Vu57kAM8iKZdAE=
-----END PRIVATE KEY-----`;

const TestOctokit = Octokit.defaults({
  throttle: { enabled: false },
  retry: { enabled: false },
});

function createTestApp() {
  return new App({
    appId: 1,
    privateKey: TEST_PRIVATE_KEY,
    webhooks: { secret: "test" },
    Octokit: TestOctokit,
    log: pino({ level: "silent" }),
  });
}

function nockAccessToken(nockInstance) {
  return nockInstance.post("/app/installations/1/access_tokens").reply(201, {
    token: "test",
    expires_at: "2099-01-01T00:00:00.000Z",
    permissions: {
      checks: "write",
      pull_requests: "read",
      metadata: "read",
    },
  });
}

module.exports = {
  TEST_PRIVATE_KEY,
  TestOctokit,
  createTestApp,
  nockAccessToken,
};
