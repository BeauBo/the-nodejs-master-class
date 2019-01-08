/**
 * Helpers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');

// Container of all the helpers
const helpers = {};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJSONToObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (err) {
    return {};
  }
};

// Check required string data
helpers.checkString = (withTrim, data) => {
  if (withTrim) {
    if (typeof data === 'string' && data.trim().length > 0) {
      return data.trim();
    }
    return false;
  }
  if (typeof data === 'string' && data.length > 0) {
    return data;
  }
  return false;
};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof str === 'string' && !!str.length) {
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  }
  return false;
};

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = (strLength) => {
  const _strLength = typeof strLength === 'number' && !!strLength ? strLength : false;
  if (_strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';
    for (let i = 1; i <= _strLength; i++) { // eslint-disable-line no-plusplus
      // Get a random character from the possibleCharacters string
      const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      str += randomCharacter;
    }
    return str;
  }
  return false;
};


module.exports = helpers;
