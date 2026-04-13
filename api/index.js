import { App } from "octokit";
import pino from "pino";

import wip from "../index.js";

const log = pino({ name: "wip" });
const app = new App({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY,
  webhooks: { secret: process.env.WEBHOOK_SECRET },
  log,
});

wip(app, log);

/**
 * Redirect `GET /` to `/stats`, pass `POST /` to webhook handler
 *
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async (request, response) => {
  if (request.method !== "POST") {
    response.writeHead(302, {
      Location: "/stats",
    });
    response.end();
    return;
  }

  // Read raw body from request stream for signature verification
  const payload = await new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => (data += chunk));
    request.on("end", () => resolve(data));
    request.on("error", reject);
  });

  try {
    await app.webhooks.verifyAndReceive({
      id: request.headers["x-github-delivery"],
      name: request.headers["x-github-event"],
      signature: request.headers["x-hub-signature-256"],
      payload,
    });

    response.writeHead(200);
    response.end("ok");
  } catch (error) {
    log.error(error);
    response.writeHead(500);
    response.end("error");
  }
};
