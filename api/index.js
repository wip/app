const { createNodeMiddleware, getOptions } = require("probot");
const app = require("../");
module.exports = createNodeMiddleware(app, getOptions());
