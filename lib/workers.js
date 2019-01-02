/**
 * Worker-related tasks
 */

// Dependencies
// const path = require('path');
// const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const _data = require('./data');
const helpers = require('./helpers');


// Instantiate the worker object
const workers = {};

// Lookup all checks get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check, (readError, originCheckData) => {
          if (!readError && originCheckData) {
            // Pass it to the check validator, and let that function continue or log error as needed
            workers.validateCheckData(originCheckData);
          } else {
            console.log('Error reading on of the check\'s data');
          }
        });
      });
    } else {
      console.log('Error: Could not find any checks to process');
    }
  });
};
// Sanity-check the check-data
workers.validateCheckData = (originCheckData) => {
  const _originalCheckData = originCheckData && typeof originCheckData === 'object' ? Object.assign({}, originCheckData) : {};
  _originalCheckData.id = typeof _originalCheckData.id === 'string' && _originalCheckData.id.trim().length === 20 ? _originalCheckData.id.trim() : false;
  _originalCheckData.userPhone = typeof _originalCheckData.userPhone === 'string' && _originalCheckData.userPhone.trim().length === 10 ? _originalCheckData.userPhone.trim() : false;
  _originalCheckData.protocol = typeof _originalCheckData.protocol === 'string' && ['http', 'https'].indexOf(_originalCheckData.protocol) > -1 ? _originalCheckData.protocol : false;
  _originalCheckData.url = typeof _originalCheckData.url === 'string' && _originalCheckData.url.trim().length > 0 ? _originalCheckData.url.trim() : false;
  _originalCheckData.method = typeof _originalCheckData.method === 'string' && ['get', 'post', 'put', 'delete'].indexOf(_originalCheckData.method) > -1 ? _originalCheckData.method : false;
  _originalCheckData.successCode = typeof _originalCheckData.successCode === 'object' && _originalCheckData.successCode instanceof Array && _originalCheckData.successCode.length > 0 ? _originalCheckData.successCode : false;
  _originalCheckData.timeoutSeconds = typeof _originalCheckData.timeoutSeconds === 'number' && _originalCheckData.timeoutSeconds % 1 === 0 && _originalCheckData.timeoutSeconds >= 1 && _originalCheckData.timeoutSeconds <= 5 ? _originalCheckData.timeoutSeconds : false;

  // Set the keys that may not be set (if the workers have never seen this check before)
  _originalCheckData.state = typeof _originalCheckData.state === 'string' && ['up', 'down'].indexOf(_originalCheckData.state) > -1 ? _originalCheckData.state : 'down';
  _originalCheckData.lastChecked = typeof _originalCheckData.lastChecked === 'number' && _originalCheckData.lastChecked > 0 ? _originalCheckData.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (
    _originalCheckData.id
    && _originalCheckData.userPhone
    && _originalCheckData.protocol
    && _originalCheckData.url
    && _originalCheckData.method
    && _originalCheckData.successCode
    && _originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(_originalCheckData);
  } else {
    console.log('Error: One of the checks is not properly formatted. Skipping it');
  }
};
// Performe the check, send the originalCheckData and outcome of the check process, to the next step in the process
workers.performCheck = (originalCheckData) => {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };
  // Mark the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
  const { hostname } = parsedUrl;
  const parsedPath = parsedUrl.path;

  // Construct the request
  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path: parsedPath,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  // Instantiate the request the object (using either http or https module)
  const _moudleToUse = originalCheckData.protocol === 'http' ? http : https;
  const req = _moudleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;
    // Update the check outcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', (e) => {
    // Update the check outcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: e,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('timeout', () => {
    // Update the check outcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End request
  req.end();
};
// Process the checkout, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never tested before (don't want to alert on that one)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  // Decide if the check is considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCode.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if an alert is warranted
  const alertWarranted = !!(originalCheckData.lastChecked && originalCheckData.state !== state);

  // Update the check data
  const _originalCheckData = Object.assign({}, originalCheckData);
  _originalCheckData.state = state;
  _originalCheckData.lastChecked = Date.now();

  // Save the updates
  _data.update('checks', _originalCheckData.id, _originalCheckData, (err) => {
    if (!err) {
      // Send the new check data to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(_originalCheckData);
      } else {
        console.log('Check outcome has not changed, no alert needed');
      }
    } else {
      console.log('Error trying to save updates to one of the checks');
    }
  });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (checkData) => {
  const msg = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} is currently ${checkData.state}`;
  helpers.sendTwilioSms(checkData.userPhone, msg, (err) => {
    if (!err) {
      console.log(`Success: User was alerted to a status change in their check, via sms: ${msg}`);
    } else {
      console.log('Error: Could not send sms alert to user who has a state change if the check');
    }
  });
};
// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};
// Init script
workers.init = () => {
  // Execute all the checks immediately
  workers.gatherAllChecks();
  // Call the loop so the checks will execute later on
  workers.loop();
};

// Export the moudle
module.exports = workers;
