/**
 * Libaray for sorting and editing data
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const helpers = require('./helpers');

// Container
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '../.data');

// Write data to a file
lib.create = (dir, file, data, cb) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'wx', (err, fd) => {
    if (!err && fd) {
      // Convert data to string
      const dataStr = JSON.stringify(data);
      // Write file and close it
      fs.writeFile(fd, dataStr, (writeErr) => {
        if (writeErr) {
          cb('Error writing to new file');
        } else {
          fs.close(fd, (closeErr) => {
            if (closeErr) {
              cb('Error closing the new file');
            } else {
              cb(false);
            }
          });
        }
      });
    } else {
      cb(err);
    }
  });
};

// Read data from a file
lib.read = (dir, file, cb) => {
  fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf-8', (err, data) => {
    if (!err && data) {
      const parsedData = helpers.parseJSONToObject(data);
      cb(false, parsedData);
    } else {
      cb(err);
    }
  });
};

// Update data inside a file
lib.update = (dir, file, data, cb) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', (err, fd) => {
    if (!err && fd) {
      const dataStr = JSON.stringify(data);
      // Truncate the file
      fs.ftruncate(fd, (updateErr) => {
        if (updateErr) {
          cb(updateErr);
        } else {
          fs.writeFile(fd, dataStr, (writeErr) => {
            if (writeErr) {
              cb(writeErr);
            } else {
              fs.close(fd, (closeErr) => {
                if (closeErr) {
                  cb(closeErr);
                } else {
                  cb(false);
                }
              });
            }
          });
        }
      });
    } else {
      cb(err);
    }
  });
};

// Delete a file
lib.delete = (dir, file, cb) => {
  // Unlink the file
  fs.unlink(`${lib.baseDir}/${dir}/${file}.json`, (err) => {
    if (err) {
      cb(err);
    } else {
      cb(false);
    }
  });
};

module.exports = lib;
