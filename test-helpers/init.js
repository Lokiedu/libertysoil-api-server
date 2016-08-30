global.Promise = require('bluebird')
global.Promise.onPossiblyUnhandledRejection((e) => { throw e; });

global.Promise.config({
  // Enable warnings.
  warnings: false,
  // Enable long stack traces.
  longStackTraces: true,
  // Enable cancellation.
  cancellation: true
});

import db_config from '../knexfile';

let exec_env = process.env.DB_ENV || 'test';
global.$dbConfig = db_config[exec_env];

process.env.NODE_ENV = 'test';
