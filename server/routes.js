/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');
var config = require('./config/environment');

module.exports = function(app) {

  // Insert routes below
  app.use('/api/templates', require('./api/template'));
  app.use('/api/documents', require('./api/document'));
  app.use('/api/users', require('./api/user'));

  app.use('/auth', require('./auth'));

  app.get('/config', function (req, res) {
    var configObject;
    res.json(200, config.client);
  });

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes (except dynamically-added genesis routes)
  // should redirect to the index.html
  app.route(/^\/(?!genesis).*/)
    .get(function(req, res) {
      res.sendfile(app.get('appPath') + '/index.html');
    });
};
