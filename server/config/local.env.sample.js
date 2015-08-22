'use strict';

// Use local.env.js for environment variables that grunt will set when the server starts locally.
// Use for your api keys, secrets, etc. This file should not be tracked by git.
//
// You will need to set these on the server you deploy to.

module.exports = {
  DOMAIN:           'http://localhost:9000',
  SESSION_SECRET:   'manticore-secret',

  // Control debug level for modules using visionmedia/debug
  DEBUG: '',

  /*
   * Supported authentication strategies.
   * 1. 'local' for using Manticore's built-in accounts system. Allow signups.
   * 2. 'webdav' for authenticating against a  WebDAV server. Only login, no signups.
   * 3. 'ldap' for authenticating against an LDAP service. Only login, no signups.
   */
  AUTH: 'local',

  /*
   * Supported storage backends.
   * 1. 'local' for storing everything in Mongo/GridFS. The fastest and most reliable way.
   *    Can be used with any AUTH strategy.
   * 2. 'webdav' for two-way synchronizing of documents with a WebDAV server.
   *    Can be used if AUTH is 'ldap' or 'webdav'; those credentials are used to talk to the webdav server.
   */
  STORAGE: 'local',

  /*
   * WebDAV server config, only if AUTH or STORAGE is 'webdav'.
   * Make sure you provide an encryption key to protect users' webdav credentials.
   */
  WEBDAV_SERVER: 'https://kolabmachine',
  WEBDAV_PATH: '/iRony/files/Files',
  WEBDAV_CREDENTIALS_KEY: 'suchweb123muchdav456',

  // LDAP server config, required iff AUTH is 'ldap'. {{username}} will be replaced with users' logins
  LDAP_SERVER: 'ldaps://kolabmachine',
  LDAP_BASE: 'ou=People,dc=test,dc=example,dc=org',
  LDAP_FILTER: '(&(objectclass=person)(|(uid={{username}})(mail={{username}})))',
  LDAP_BIND_DN: 'uid=kolab-service,ou=Special Users,dc=test,dc=example,dc=org',
  LDAP_BIND_PW: 'kolab-service-pass'
};
