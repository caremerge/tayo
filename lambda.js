"use strict";
const awsServerlessExpress = require("aws-serverless-express");
const app = require("./app");
const eventBridge = require("./eventBridge/index.js");

// NOTE: If you get ERR_CONTENT_DECODING_FAILED in your browser, this is likely
// due to a compressed response (e.g. gzip) which has not been handled correctly
// by aws-serverless-express and/or API Gateway. Add the necessary MIME types to
// binaryMimeTypes below, then redeploy (`npm run package-deploy`)
const binaryMimeTypes = [
  "application/octet-stream",
  "font/eot",
  "font/opentype",
  "font/otf",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
];
const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes);

exports.handler = async (event, context) => {
  if (event.path) {
    console.log("request received for path: ", event.path);
    return awsServerlessExpress.proxy(server, event, context, "PROMISE")
      .promise;
  } else if (event.aqi) {
    console.log("request received for aqi: ", event.aqi);
    return eventBridge.aqiPoster(event.aqi)
  }
};
