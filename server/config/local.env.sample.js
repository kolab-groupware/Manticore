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
   * Default access permissions for documents.
   * If a user has a link to a session and tries to open it, this represents the
   * access type they have if no permission has been explicitly set for them.
   * Possible values: 'write', 'read', 'deny'.
   * By default, is set to 'write' for testing purposes.
   * If completely outsourcing access control to a third party service (like Kolab), set it to 'deny'.
   * If left blank, defaults to 'deny'.
   */
  DEFAULT_ACCESS: 'deny',

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
   *    Can be used if AUTH is 'ldap' or 'webdav'; those credentials are used to talk to the storage server.
   * 3. 'chwala' can be used for integrating with Kolab.
   */
  STORAGE: 'local',

  /*
   * WebDAV server config, only if AUTH or STORAGE is 'webdav'.
   */
  WEBDAV_SERVER: 'https://demo.owncloud.org',
  WEBDAV_PATH: '/remote.php/webdav',

  CHWALA_SERVER: 'http://172.17.0.12',

  /*
   * Make sure you provide an encryption key to protect users' auth credentials.
   * This is necessary because the storage server may not support authentication tokens.
   */
  AUTH_ENCRYPTION_KEY: 'suchauth123muchkey456',

  // LDAP server config, only if AUTH is 'ldap'
  LDAP_SERVER: 'ldap://172.17.0.12',
  LDAP_BASE: 'ou=People,dc=example,dc=org',
  LDAP_FILTER: '(&(objectclass=person)(|(uid={{username}})(mail={{username}})))',
  LDAP_BIND_DN: 'uid=binderservice,ou=Special Users,dc=example,dc=org',
  LDAP_BIND_PW: 'binderpass',

  // locodoc Server config
  LOCODOC_SERVER: 'http://localhost:3030'
};
