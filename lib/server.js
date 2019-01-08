/**
 * Server-related tasks
 */

// Dependencies
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const util = require('util');

const debug = util.debuglog('server');
const helpers = require('./helpers');
const config = require('./config');
const handlers = require('./handlers');

// Instantiate the server module object
const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOption = {
  key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem')),
};

server.httpsServer = https.createServer(server.httpsServerOption, (req, res) => {
  server.unifiedServer(req, res);
});

// All the server logic for both http and https server
server.unifiedServer = (req, res) => {
  // Get the URL and parse it
  const parsedURL = url.parse(req.url, true);

  // Get path
  const { pathname } = parsedURL;
  const trimmedPath = pathname.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = parsedURL.query;

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
    const chosenHandler = typeof server.router[trimmedPath] === 'undefined' ? handlers.notFound : server.router[trimmedPath];

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJSONToObject(buffer),
    };

    // Route the request to the handler sepecified in th router
    chosenHandler(data, (statusCode = 200, payload = {}) => {
      // Return response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(JSON.stringify(payload));

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
  users: handlers.users,
  tokens: handlers.tokens,
};

// Init script
server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => console.log('\x1b[33m%s\x1b[0m', `The server is listening on port ${config.httpPort}`));

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpsPort}`));
};

// Export the module
module.exports = server;
