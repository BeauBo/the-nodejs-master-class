/**
 * Primary file for the API
 */

// Dependencies

const http = require('http');
const url = require('url');
const { StringDecoder } = require('string_decoder');


// The server should respond to all requests with a string
const server = http.createServer((req, res) => {
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
      payload: buffer,
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
});

// Start the server, and it listen on 3000
server.listen(3000, () => console.log('The server is listening on port 3000 now'));

// Define handlers
const handlers = {};

// Sample handler
handlers.sample = (data, cb) => {
  // Callback a http code, and a payload object
  cb(406, { name: 'sample handler' });
};

// Not found handler
handlers.notFound = (data, cb) => cb(404);
// Define a request router
const router = {
  sample: handlers.sample,
};
