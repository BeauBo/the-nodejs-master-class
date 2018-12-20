/**
 * Create and export configuration variables
 *
 */

// Container for all the environments
const env = {};

// Staging (default) environment
env.staging = {
  port: 3000,
  envName: 'staging',
};

// Production env
env.production = {
  port: 5000,
  envName: 'production',
};

// Determine which env was passed as a command-line argument
const currentEnv = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current env is one of the env above, if not, default to staging
const envToExport = typeof env[currentEnv] === 'object' ? env[currentEnv] : env.staging;


// Export the module
module.exports = envToExport;
