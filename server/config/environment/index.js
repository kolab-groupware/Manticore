'use strict';

var path = require('path');
var _ = require('lodash');

function requiredProcessEnv(name) {
  if(!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}

// All configurations will extend these options
// ============================================
var all = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || 9000,

  // Should we populate the DB with sample data?
  seedDB: true,

  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: 'manticore-secret'
  },

  // List of user roles
  userRoles: ['guest', 'user', 'admin'],

  // MongoDB connection options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },

  conversionHost: process.env.LOCODOC_SERVER,

  auth: {
      type: process.env.AUTH || 'local',
      'webdav': {
          server: process.env.WEBDAV_SERVER,
          path: process.env.WEBDAV_PATH,
          key: process.env.WEBDAV_ENCRYPTION_KEY
      },
      'ldap': {
          server: process.env.LDAP_SERVER,
          base: process.env.LDAP_BASE,
          filter: process.env.LDAP_FILTER,
          bindDn: process.env.LDAP_BIND_DN,
          bindPw: process.env.LDAP_BIND_PW
      }
  },
  storage: {
      type: process.env.STORAGE || 'local',
      'webdav': {
          server: process.env.WEBDAV_SERVER,
          path: process.env.WEBDAV_PATH,
          key: process.env.WEBDAV_ENCRYPTION_KEY
      }
  }
};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {});
