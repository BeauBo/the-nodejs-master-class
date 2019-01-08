/**
 * Requrest handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Handlers container
const handlers = {};

// Not Found handler
handlers.notFound = (data, cb) => cb(404);

// Users handler
handlers.users = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    return handlers._users[data.method](data, cb);
  }
  return cb(405);
};

// Submethods of users container
handlers._users = {};

// Users - post
// Required data: firstName, lastName, email, password, address
// Optional data: none
handlers._users.post = (data, cb) => {
  // Check all required fields are filled out
  const firstName = helpers.checkString(true, data.payload.firstName);
  const lastName = helpers.checkString(true, data.payload.lastName);
  const email = helpers.checkString(true, data.payload.email);
  const password = helpers.checkString(true, data.payload.password);
  const address = helpers.checkString(false, data.payload.address);

  if (firstName && lastName && email && password && address) {
    // Make sure the user doesn't already exist
    _data.read('users', email, (err) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (!hashedPassword) {
          cb(500, { error: 'Could not hash the user\'s password' });
        } else {
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            address,
          };

          // Store the user object
          _data.create('users', email, userObject, (createErr) => {
            if (createErr) {
              console.log(createErr);
              cb(500, { error: 'Could not create the new user' });
            } else {
              cb(200);
            }
          });
        }
      } else {
        cb(400, { error: 'A user with the email already exists!' });
      }
    });
  } else {
    cb(400, { error: 'Missing required fields' });
  }
};

// Users - get
// Required data: email
// Optional data: none


// Tokens handler
handlers.tokens = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    return handlers._tokens[data.method](data, cb);
  }
  return cb(405);
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: email, password
// Optional data: none;
handlers._tokens.post = (data, cb) => {
  const email = helpers.checkString(true, data.payload.email);
  const password = helpers.checkString(true, data.payload.password);

  if (email && password) {
    // Lookup the user who matches the email
    _data.read('users', email, (readErr, userObject) => {
      if (!readErr && userObject) {
        // Hash the sent password and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userObject.password) {
          // If valid, create a new token with a random name. Set expiration data 1 hour in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            email,
            id: tokenId,
            expires,
          };
          _data.create('tokens', tokenId, tokenObject, (createErr) => {
            if (createErr) {
              cb(500, { error: 'Could not create new token for some reasons' });
            } else {
              cb(200, tokenObject);
            }
          });
        } else {
          cb(400, { error: 'Wrong password' });
        }
      } else {
        cb(400, { error: 'Could not find specified user' });
      }
    });
  } else {
    cb(400, { error: 'Missing required email or password' });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, cb) => {
  // Check the id sent is valid
  const id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the token
    _data.read('tokens', id, (readErr, tokenObject) => {
      if (!readErr && tokenObject) {
        cb(200, tokenObject);
      } else {
        cb(404);
      }
    });
  } else {
    cb(404);
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, cb) => {
  const id = typeof data.payload.id === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  const extend = !!(typeof data.payload.extend === 'boolean' && data.payload.extend === true);

  if (id && extend) {
    // Lookup the token
    _data.read('tokens', id, (readErr, tokenObject) => {
      if (!readErr && tokenObject) {
        // Check to make sure the token isn't already expired
        if (tokenObject.expires > Date.now()) {
          // Set the expiration an hour from now
          const extendedToken = Object.assign({}, tokenObject);
          extendedToken.expires = Date.now() + 1000 * 60 * 60;

          // Store the new token
          _data.update('tokens', id, extendedToken, (updateErr) => {
            if (updateErr) {
              cb(500, { error: 'Error updating token\'s expiration' });
            } else {
              cb(200);
            }
          });
        } else {
          cb(400, { error: 'The token has already expired, and cannot be extended' });
        }
      } else {
        cb(400, { error: 'The token does not exist' });
      }
    });
  } else {
    cb(400, { error: 'Missing required field(s) or field(s) are invalid' });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, cb) => {
  // Check the id is valid
  const id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Look up the token
    _data.read('tokens', id, (readErr, tokenObject) => {
      if (!readErr && tokenObject) {
        _data.delete('tokens', id, (deleteErr) => {
          if (deleteErr) {
            return cb(500, { error: 'Error deleting token' });
          }
          return cb(200);
        });
      } else {
        cb(400, { error: 'Could not find the token' });
      }
    });
  } else {
    cb(400, { error: 'Missing required token id' });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, email, cb) => {
  // Lookup the token
  _data.read('tokens', id, (readErr, tokenObject) => {
    if (!readErr && tokenObject) {
      // Check that the token is for the given user and has not expired
      if (tokenObject.email === email && tokenObject.expires > Date.now()) {
        return cb(true);
      }
      return cb(false);
    }
    return cb(false);
  });
};

module.exports = handlers;
