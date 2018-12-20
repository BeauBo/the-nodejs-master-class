const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const config = require('./config');


// Instantiate HTTP server
const httpServer = http.createServer((req, res) => server(req, res));

// Start HTTP server
httpServer.listen(config.httpPort, () => console.log(`Server is now listening on port: ${config.httpPort}`));


// Instatiate HTTPS server
const httpsOptions = {
  key: fs.readFileSync('../https/key.pem'),
  cert: fs.readFileSync('../https/cert.pem'),
};
const httpsServer = https.createServer(httpsOptions, (req, res) => server(req, res));
// Start HTTPS server
httpsServer.listen(config.httpsPort, () => console.log(`Server is now listening port: ${config.httpsPort}`));

// Server for both HTTP and HTTPS
const server = ((req, res) => {
  const parsedURL = url.parse(req.url, true);
  const path = parsedURL.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

  // Get payload
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', data => buffer += decoder.write(data));
  req.on('end', () => {
    const routerHandler = typeof routers[path] === 'undefined' ? handlers.notFound : routers[path];
    routerHandler(buffer, (statusCodeCalledBack, payloadCalledBack) => {
      const statusCode = typeof statusCodeCalledBack === 'number' ? statusCodeCalledBack : 200;
      const payload = typeof payloadCalledBack === 'object' ? payloadCalledBack : {};
      const payloadString = JSON.stringify(`${payload.message}, the data you just posted is '${payload.data}'`);

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);

      if (statusCode === 404) {
        res.end('No records found');
      } else {
        res.end(payloadString);
      }
      console.log('Returning this response:', statusCode, payload);
    });
  });
});

// Handlers
const handlers = {
  notFound: (data, cb) => cb(404),
  hello: (data, cb) => cb(200, { data, message: 'Welcome to HELLO party' }),
};

const routers = {
  hello: handlers.hello,
};
