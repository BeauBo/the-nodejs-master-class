/**
 * Helpers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const config = require('../src/config');

// Container fo all the helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof str === 'string' && !!str.length) {
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  }
  return false;
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJSONToObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (err) {
    return {};
  }
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

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, cb) => {
  // Validate parameters
  const validatedPhone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false;
  const validatedMsg = typeof msg === 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if (validatedPhone && validatedMsg) {
    // Configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: `+1${validatedPhone}`,
      Body: validatedMsg,
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Configure the rquest details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };
    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if the request went through
      if (status === 200 || status === 201) {
        cb(false);
      } else {
        cb(`Status code returned was ${status}`);
      }
    });

    // Bind to the error envent so it doesn't get thrown
    req.on('error', e => cb(e));
    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    cb('Given parameters were missing or invalid');
  }
};

module.exports = helpers;
