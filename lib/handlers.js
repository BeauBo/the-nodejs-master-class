/**
 * Request handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('../src/config');

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
handlers._users.get = (data, cb) => {
  // Check that the phone number is valid
  const phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Get the token from the headers
    const token = typeof data.headers.token === 'string' ? data.headers.token : false;
    // Verify that the given token from headers is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (isValidToken) => {
      if (isValidToken) {
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
        cb(403, { error: 'Missing required token in header or token is invalid' });
      }
    });
  } else {
    cb(400, { error: 'Missing required phone number' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName lastName password (at least one must be specified)
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
      // Get the token from the headers
      const token = typeof data.headers.token === 'string' ? data.headers.token : false;
      // Verify that the given token from headers is valid for the phone number
      handlers._tokens.verifyToken(token, phone, (isValidToken) => {
        if (isValidToken) {
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
          cb(403, { error: 'Missing required token in header or token is invalid' });
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

handlers._users.delete = (data, cb) => {
  // Check that the phone number is valid
  const phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Get the token from the headers
    const token = typeof data.headers.token === 'string' ? data.headers.token : false;
    // Verify that the given token from headers is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (isValidToken) => {
      if (isValidToken) {
        // Lookup the user
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', phone, (deleteError) => {
              if (!deleteError) {
                // Delete each of the checks associated with the user
                const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks.slice() : [];
                const checksToDelete = userChecks.length;

                if (checksToDelete > 0) {
                  userChecks.forEach((checkId) => {
                    // Delete the check
                    _data.delete('checks', checkId, (deletionError) => {
                      if (deletionError) {
                        return cb(500, { error: 'Errors encountered while attempting to delete all the checks for the user' });
                      }
                      return cb(200);
                    });
                  });
                } else {
                  cb(200);
                }
              } else {
                cb(500, { error: 'Could not delete the specified user' });
              }
            });
          } else {
            cb(400, { error: 'Could not find the specified user' });
          }
        });
      } else {
        cb(403, { error: 'Missing required token in header or token is invalid' });
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
          _data.create('tokens', tokenId, tokenObject, (createError) => {
            if (createError) {
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
// Required data: id
// Optional data: none
handlers._tokens.get = (data, cb) => {
  // Check the id sent is valid
  const id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the token
    _data.read('tokens', id, (err, token) => {
      if (!err && token) {
        cb(200, token);
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
    _data.read('tokens', id, (err, token) => {
      if (!err && token) {
        // Check to make sure the token isn't already expired
        if (token.expires > Date.now()) {
          // Set the expiration an hour from now
          const extendedToken = Object.assign({}, token);

          extendedToken.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update('tokens', id, extendedToken, (updateError) => {
            if (updateError) {
              return cb(500, { error: 'Could not update the token\'s expiration' });
            }
            return cb(200);
          });
        } else {
          cb(400, { error: 'The token has already expired, and cannot be extended' });
        }
      } else {
        cb(400, { error: 'Specified token does not exist' });
      }
    });
  } else {
    cb(400, { error: 'Missing required fields(s) or field(s) are invalid' });
  }
};
// Tokens - delete
// Required Data: id
// Optional Data: none
handlers._tokens.delete = (data, cb) => {
  // Check that the id is valid
  const id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the token
    _data.read('tokens', id, (err, token) => {
      if (!err && token) {
        _data.delete('tokens', id, (deleteError) => {
          if (!deleteError) {
            cb(200);
          } else {
            cb(500, { error: 'Could not delete the specified token' });
          }
        });
      } else {
        cb(400, { error: 'Could not find the specified token' });
      }
    });
  } else {
    cb(400, { error: 'Missing required id' });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, cb) => {
  // Lookup the token
  _data.read('tokens', id, (err, token) => {
    if (!err && token) {
      // Check that the token is for the given user and has not expired
      if (token.phone === phone && token.expires > Date.now()) {
        cb(true);
      } else {
        cb(false);
      }
    } else {
      cb(false);
    }
  });
};

// Checks handler
handlers.checks = (data, cb) => {
  const acceptableMethos = ['post', 'get', 'put', 'delete'];
  if (acceptableMethos.indexOf(data.method) > -1) {
    return handlers._checks[data.method](data, cb);
  }
  return cb(405);
};

// Container for all the checks methods
handlers._checks = {};

// Checks -POST
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Oprional data: none
handlers._checks.post = (data, cb) => {
  // Validate inputs
  const protocol = typeof data.payload.protocol === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol.trim() : false;
  const url = typeof data.payload.url === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof data.payload.method === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method.trim() : false;
  const successCode = typeof data.payload.successCode === 'object' && data.payload.successCode instanceof Array && data.payload.successCode.length > 0 ? data.payload.successCode : false;
  const timeoutSeconds = typeof data.payload.timeoutSeconds === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds <= 5 && data.payload.timeoutSeconds >= 1 ? data.payload.timeoutSeconds : false;

  if (protocol && url && method && successCode && timeoutSeconds) {
    // Get the token from headers
    const token = typeof data.headers.token === 'string' ? data.headers.token : false;
    // Lookup the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        // Lookup the user data
        _data.read('users', userPhone, (userError, userData) => {
          if (!userError && userData) {
            const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks.slice() : [];
            // Verify that the user has less than the number of max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = helpers.createRandomString(20);
              // Create the check object, and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCode,
                timeoutSeconds,
              };

              // Save the object
              _data.create('checks', checkId, checkObject, (createError) => {
                if (createError) {
                  return cb(500, { error: 'Could not create the new check' });
                }
                // Add the checkId to the user object
                const userDataWithChecks = Object.assign({}, userData, { checks: userChecks });
                userDataWithChecks.checks.push(checkId);
                // Save the new user data
                return _data.update('users', userPhone, userDataWithChecks, (addChecksError) => {
                  if (addChecksError) {
                    return cb(500, { error: 'Could not update the user with new check' });
                  }
                  // Return the data about the new check
                  return cb(200, checkObject);
                });
              });
            } else {
              cb(400, { error: `The user already has the maximun number of checks ${config.maxChecks}` });
            }
          } else {
            cb(403);
          }
        });
      } else {
        cb(403);
      }
    });
  } else {
    cb(400, { error: 'Missing required inputs or inputs are invalid' });
  }
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data, cb) => {
  // Check that the id is valid
  const id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the checks
    _data.read('checks', id, (readError, checkData) => {
      if (!readError && checkData) {
        // Get the token from the headers
        const token = typeof data.headers.token === 'string' ? data.headers.token : false;
        // Verify that the given token from headers is valid and bleongs to the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, (isValidToken) => {
          if (isValidToken) {
            // Return the check data
            cb(200, checkData);
          } else {
            cb(403);
          }
        });
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { error: 'Missing required phone number' });
  }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCode, timeoutSeconds (one must be sent)
handlers._checks.put = (data, cb) => {
  // Check the required field
  const id = typeof data.payload.id === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  // Check for the optional field
  const protocol = typeof data.payload.protocol === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol.trim() : false;
  const url = typeof data.payload.url === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof data.payload.method === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method.trim() : false;
  const successCode = typeof data.payload.successCode === 'object' && data.payload.successCode instanceof Array && data.payload.successCode.length > 0 ? data.payload.successCode : false;
  const timeoutSeconds = typeof data.payload.timeoutSeconds === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds <= 5 && data.payload.timeoutSeconds >= 1 ? data.payload.timeoutSeconds : false;

  if (id) {
    // Check to make sure one or more optional fields has been sent
    if (protocol || url || method || successCode || timeoutSeconds) {
      // Lookup check
      _data.read('checks', id, (readError, checkData) => {
        if (!readError && checkData) {
          // Get the token from the headers
          const token = typeof data.headers.token === 'string' ? data.headers.token : false;
          // Verify that the given token from headers is valid and bleongs to the user who created the check
          handlers._tokens.verifyToken(token, checkData.userPhone, (isValidToken) => {
            if (isValidToken) {
              // Update the check where necessary
              const checkDataToUpdate = Object.assign({}, checkData);
              if (protocol) {
                checkDataToUpdate.protocol = protocol;
              }
              if (url) {
                checkDataToUpdate.url = url;
              }
              if (method) {
                checkDataToUpdate.method = method;
              }
              if (successCode) {
                checkDataToUpdate.successCode = successCode;
              }
              if (timeoutSeconds) {
                checkDataToUpdate.timeoutSeconds = timeoutSeconds;
              }
              // Store the updates
              _data.update('checks', id, checkDataToUpdate, (updateError) => {
                if (!updateError) {
                  cb(200);
                } else {
                  cb(500, { error: 'Could not update the check' });
                }
              });
            } else {
              cb(403);
            }
          });
        } else {
          cb(400, { error: 'Check ID did not exist' });
        }
      });
    } else {
      cb(400, { error: 'Missing fields to update' });
    }
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, cb) => {
  // Check that the id is valid
  const id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, (readError, checkData) => {
      if (!readError && checkData) {
        // Get the token from the headers
        const token = typeof data.headers.token === 'string' ? data.headers.token : false;
        // Verify that the given token from headers is valid for the phone number
        handlers._tokens.verifyToken(token, checkData.userPhone, (isValidToken) => {
          if (isValidToken) {
            // Delete the check data
            _data.delete('checks', id, (deleteError) => {
              if (!deleteError) {
                // Lookup the user
                _data.read('users', checkData.userPhone, (err, userData) => {
                  if (!err && userData) {
                    const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks.slice() : [];
                    // Remove the delete check from their list of checks
                    const idx = userChecks.indexOf(id);
                    if (idx > -1) {
                      userChecks.splice(idx, 1);
                      const userDataToUpdate = Object.assign({}, userData, { checks: userChecks });
                      // Re save the userData
                      _data.update('users', checkData.userPhone, userDataToUpdate, (updateError) => {
                        if (!updateError) {
                          cb(200);
                        } else {
                          cb(500, { error: 'Could not update the specified user' });
                        }
                      });
                    } else {
                      cb(500, { error: 'Could not find the check on the user object' });
                    }
                  } else {
                    cb(500, { error: 'Could not find the user who created the check, so could not remove the check from the list of checks on the user object' });
                  }
                });
              } else {
                cb(500, { error: 'Could not delete the check data' });
              }
            });
          } else {
            cb(403);
          }
        });
      } else {
        cb(400, { error: 'The specified check ID does not exist' });
      }
    });
  } else {
    cb(400, { error: 'Missing required phone number' });
  }
};
// Not found handler
handlers.notFound = (data, cb) => cb(404);


// Export the module
module.exports = handlers;
