/**
 * Server-related tasks
 */
// Dependencies

const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');
const path = require('path');
const util = require('util');
const config = require('../src/config');
const handlers = require('../lib/handlers');
const helpers = require('../lib/helpers');

const debug = util.debuglog('server');

// Instantiate the server module object
const server = {};

// instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOption = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};
server.httpsServer = https.createServer(server.httpsServerOption, (req, res) => {
  server.unifiedServer(req, res);
});

// All the server logic for both http and https server
server.unifiedServer = (req, res) => {
  // Get the URL and parse it
  const parseURL = url.parse(req.url, true);

  // Get the path
  const { pathname } = parseURL;
  const trimmedPath = pathname.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = parseURL.query;

  // Get HTTP method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const { headers } = req;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', data => buffer += decoder.write(data));
  req.on('end', () => {
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, use the not found handler
    const chosenHandler = typeof server.router[trimmedPath] !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJSONToObject(buffer),
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCodeCalledBack, payloadCalledBack) => {
      // Use the status code called back by the handler, or default to 200
      const statusCode = typeof statusCodeCalledBack === 'number' ? statusCodeCalledBack : 200;
      // Use the payload called back by the handler, or default an empty obejct
      const payload = typeof payloadCalledBack === 'object' ? payloadCalledBack : {};
      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, print green otherwise print red
      if (statusCode === 200) {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
      } else {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
      }
    });
  });
};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

// Init script
server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort}`));
  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort}`));
};

// Export the module
module.exports = server;
