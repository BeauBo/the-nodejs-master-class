/**
 * Primary file for the API
 */

// Dependencies

const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');
const config = require('./config');
const handlers = require('../lib/handlers');
const helpers = require('../lib/helpers');

// instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, () => console.log(`The server is listening on port ${config.httpPort} now`));

// Instantiate the HTTPS server
const httpsServerOption = {
  key: fs.readFileSync('../https/key.pem'),
  cert: fs.readFileSync('../https/cert.pem'),
};
const httpsServer = https.createServer(httpsServerOption, (req, res) => {
  unifiedServer(req, res);
});
// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => console.log(`The server is listening on port ${config.httpsPort} now`));
// All the server logic for both http and https server
const unifiedServer = (req, res) => {
  // Get the URL and parse it
  const parseURL = url.parse(req.url, true);

  // Get the path
  const path = parseURL.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

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
    const chosenHandler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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
      // Log the request path
      console.log('Returning this response:', statusCode, payloadString);
    });
  });
};

// Define a request router
const router = {
  ping: handlers.ping,
  users: handlers.users,
};
