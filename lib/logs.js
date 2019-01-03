/**
 * Library for storing and rotating logs
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const lib = {};

// Base directory of the logs folder
lib.baseDir = path.join(__dirname, '/../.logs');

// Append a string to a file. Create the file if it does not exist.
lib.append = (fileName, str, cb) => {
  // Open the file for appending
  fs.open(`${lib.baseDir}/${fileName}.log`, 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, `${str}\n`, (appendingErr) => {
        if (!appendingErr) {
          fs.close(fileDescriptor, (closeErr) => {
            if (!closeErr) {
              cb(false);
            } else {
              cb('Error closing file that was being appended');
            }
          });
        } else {
          cb('Error appending to file');
        }
      });
    } else {
      cb('Could not open file for appending');
    }
  });
};

// List all the logs, and optinally include the compressed logs
lib.list = (includeCompressedLogs, cb) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        // Add the .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }

        // Add on the .gz files
        if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      });
      cb(false, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = (logId, newField, cb) => {
  const sourceFile = `${logId}.log`;
  const destFile = `${newField}.gz.b64`;

  // Read the source file
  fs.readFile(`${lib.baseDir}/${sourceFile}`, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (gzipError, buffer) => {
        if (!gzipError && buffer) {
          fs.open(`${lib.baseDir}/${destFile}`, 'wx', (openError, fileDescriptor) => {
            if (!openError && fileDescriptor) {
              // Write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), (writeError) => {
                if (!writeError) {
                  fs.close(fileDescriptor, (closeError) => {
                    if (!closeError) {
                      cb(false);
                    } else {
                      cb(closeError);
                    }
                  });
                } else {
                  cb(writeError);
                }
              });
            } else {
              cb(openError);
            }
          });
        } else {
          cb(gzipError);
        }
      });
    } else {
      cb(err);
    }
  });
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = (fileId, cb) => {
  const fileName = `${fileId}.gz.b64`;
  fs.readFile(`${lib.baseDir}/${fileName}`, 'utf8', (err, str) => {
    if (!err && str) {
      // Decompress the data
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (unzipError, outputBuffer) => {
        if (!unzipError && outputBuffer) {
          // Callback
          const decompressedStr = outputBuffer.toString();
          cb(false, decompressedStr);
        } else {
          cb(unzipError);
        }
      });
    } else {
      cb(err);
    }
  });
};

// Truncate a log file
lib.truncate = (logId, cb) => {
  fs.truncate(`${lib.baseDir}/${logId}.log`, 0, (err) => {
    if (!err) {
      cb(false);
    } else {
      cb(err);
    }
  });
};


// Export the module
module.exports = lib;
