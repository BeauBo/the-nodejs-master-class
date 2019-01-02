/**
 * Libaray for storing and editing data
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module (to be exported)
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data');

// Write data to a file
lib.create = (dir, file, data, cb) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to string
      const strData = JSON.stringify(data);
      // Write to file and close it
      return fs.writeFile(fileDescriptor, strData, (writeError) => {
        if (writeError) {
          return cb('Error writing to new file');
        }
        return fs.close(fileDescriptor, (closeError) => {
          if (closeError) {
            return cb('Error closing new file');
          }
          return cb(false);
        });
      });
    }
    return cb(err);
  });
};

// Read data from a file
lib.read = (dir, file, cb) => {
  fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf-8', (err, data) => {
    if (!err && data) {
      const parsedData = helpers.parseJSONToObject(data);
      return cb(false, parsedData);
    }
    return cb(err, data);
  });
};

// Update data inside a file
lib.update = (dir, file, data, cb) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      const strData = JSON.stringify(data);
      // Truncate the file
      return fs.ftruncate(fileDescriptor, (updateError) => {
        if (updateError) {
          return cb(updateError);
        }
        return fs.writeFile(fileDescriptor, strData, (writeError) => {
          if (writeError) {
            return cb(writeError);
          }
          return fs.close(fileDescriptor, (closeError) => {
            if (closeError) {
              return cb(closeError);
            }
            return cb(false);
          });
        });
      });
    }
    return cb(err);
  });
};

// Delete a file
lib.delete = (dir, file, cb) => {
  // Unlink the file
  fs.unlink(`${lib.baseDir}/${dir}/${file}.json`, (error) => {
    if (error) {
      return cb(error);
    }
    return cb(false);
  });
};

// List all the items in a directory
lib.list = (dir, cb) => {
  fs.readdir(`${lib.baseDir}/${dir}/`, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        trimmedFileNames.push(fileName.replace('.json', ''));
      });
      cb(false, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

module.exports = lib;
