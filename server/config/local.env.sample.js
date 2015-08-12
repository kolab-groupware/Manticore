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
   * 1. 'local' for storing everything in Mongo/GridFS, auth using username/password
   * 2. 'webdav' for linking with a WebDAV server, auth using WebDAV credentials
   */
  STORAGE: 'webdav',

  // More configuration for the chosen auth type. None required for 'local'
  WEBDAV_SERVER: 'https://apps.kolabnow.com',
  WEBDAV_PATH: '/files/Files'
};
