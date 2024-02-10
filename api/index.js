// @ts-check

import { createNodeMiddleware, createProbot } from "probot";

import app from "../index.js";

const probot = createProbot();
const middleware = createNodeMiddleware(app, { probot, webhooksPath: "/" });

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Redirect `GET /` to `/stats`, pass `POST /` to Probot's middleware
 *
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.writeHead(302, {
      Location: "/stats",
    });
    response.end();
    return;
  }

  middleware(request, response);
}
