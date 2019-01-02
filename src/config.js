/**
 * Create and export configuration variables
 *
 */

// Container for all the environments
const env = {};

// Staging (default) environment
env.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsASecret',
  maxChecks: 5,
  twilio: {
    accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken: '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone: '+15005550006',
  },
};

// Production env
env.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAlsoASecret',
  maxChecks: 5,
};

// Determine which env was passed as a command-line argument
const currentEnv = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current env is one of the env above, if not, default to staging
const envToExport = typeof env[currentEnv] === 'object' ? env[currentEnv] : env.staging;


// Export the module
module.exports = envToExport;
