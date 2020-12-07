const { createNodeMiddleware, createProbot } = require("probot");

const app = require("../");
const probot = createProbot();

module.exports = createNodeMiddleware(app, { probot });
