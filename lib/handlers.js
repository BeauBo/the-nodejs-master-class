/**
 * Request handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Define handlers
const handlers = {};

// Ping handler
handlers.ping = (data, cb) => {
  cb(200);
};

// Users handler
handlers.users = (data, cb) => {
  const acceptableMethos = ['post', 'get', 'put', 'delete'];
  if (acceptableMethos.indexOf(data.method) > -1) {
    return handlers._users[data.method](data, cb);
  }
  return cb(405);
};

// Container for the suers submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, cb) => {
  // Check that all required fields are filled out
  const firstName = typeof data.payload.firstName === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof data.payload.lastName === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  const tosAgreement = typeof data.payload.tosAgreement === 'boolean' && data.payload.tosAgreement ? data.payload.tosAgreement : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure the user doesnt already exist
    return _data.read('users', phone, (error) => {
      if (error) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (!hashedPassword) {
          return cb(500, { error: 'Could not hash user\'s password' });
        }
        // Create the user object
        const userObject = {
          firstName,
          lastName,
          phone,
          password: hashedPassword,
          tosAgreement: true,
        };

        // Store the suer
        return _data.create('users', phone, userObject, (err) => {
          if (err) {
            console.log(err);
            return cb(500, { error: 'Could not create the new user' });
          }
          return cb(200);
        });
      }
      return cb(400, { error: 'A user with the phone number already exists!' });
    });
  }
  return cb(400, { error: 'Missing required fields' });
};

// Users - get
// Required data: phone
// Optionsal data: none
// @TODO Only let an authenticated user aceess their object, Don't let them access anyone else
handlers._users.get = (data, cb) => {
  // Check that the phone number is valid
  const phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Lookup the user
    _data.read('users', phone, (err, userObject) => {
      if (!err && userObject) {
        // Remove the hashed password from the user object before returning it to the requester
        delete userObject.password; // eslint-disable-line no-param-reassign
        cb(200, userObject);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { error: 'Missing required phone number' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName lastName password (at least one must be specified)
// @TODO Only let authenticated user update their own object. Don't let them update anyone else's
handlers._users.put = (data, cb) => {
  // Check the required field
  const phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  // Check for the required field
  const firstName = typeof data.payload.firstName === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof data.payload.lastName === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if the phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Lookup the user
      _data.read('users', phone, (err, userObject) => {
        if (!err && userObject) {
          // Update the fields necessary
          const userObjectToUpdate = Object.assign({}, userObject);
          if (firstName) {
            userObjectToUpdate.firstName = firstName;
          }
          if (lastName) {
            userObjectToUpdate.lastName = lastName;
          }
          if (password) {
            userObjectToUpdate.password = helpers.hash(password);
          }

          // Store the new updates
          _data.update('users', phone, userObjectToUpdate, (updateError) => {
            if (!updateError) {
              cb(200);
            } else {
              console.log(updateError);
              cb(500, { error: 'Could not update the user' });
            }
          });
        } else {
          cb(400, { error: 'The specified user does not exist' });
        }
      });
    } else {
      cb(400, { error: 'Missing fields to update' });
    }
  } else {
    cb(400, { error: 'Missing required phone number' });
  }
};

// Users - delete
// Required data: phone
// @TODO Only let authenticated user delete their object. Don't let them delete anyone else's
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = (data, cb) => {
  // Check that the phone number is valid
  const phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Lookup the user
    _data.read('users', phone, (err, userObject) => {
      if (!err && userObject) {
        _data.delete('users', phone, (deleteError) => {
          if (!deleteError) {
            cb(200);
          } else {
            cb(500, { error: 'Could not delete the specified user' });
          }
        });
      } else {
        cb(400, { error: 'Could not find the specified user' });
      }
    });
  } else {
    cb(400, { error: 'Missing required phone number' });
  }
};

// Tokens handler
handlers.tokens = (data, cb) => {
  const acceptableMethos = ['post', 'get', 'put', 'delete'];
  if (acceptableMethos.indexOf(data.method) > -1) {
    return handlers._tokens[data.method](data, cb);
  }
  return cb(405);
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, cb) => {
  const phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if (phone && password) {
    // Lookup the user woh matches that phone number
    _data.read('users', phone, (err, userObject) => {
      if (!err && userObject) {
        // Hash the sent password and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userObject.password) {
          // If valid, create a new token with a random name. Set expiration data 1 hour in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };
          _data.create('tokens', tokenId, tokenObject, (err) => {
            if (err) {
              return cb(500, { error: 'Could not create new token for some reasons' });
            }
            return cb(200, tokenObject);
          });
        } else {
          cb(400, { error: 'Password did not match the specified user\'s stored password' });
        }
      } else {
        cb(400, { error: 'Could not find the specified user' });
      }
    });
  } else {
    cb(400, { error: 'Missing required phone number or password' });
  }
};
// Tokens - get
handlers._tokens.get = (data, cb) => {

};
// Tokens - put
handlers._tokens.put = (data, cb) => {

};
// Tokens - delete
handlers._tokens.delete = (data, cb) => {

};
// Not found handler
handlers.notFound = (data, cb) => cb(404);


// Export the module
module.exports = handlers;
