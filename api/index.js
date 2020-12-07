const { createNodeMiddleware, createProbot } = require("probot");

const app = require("../");
const probot = createProbot();
const middleware = createNodeMiddleware(app, { probot });

module.exports = middleware;
