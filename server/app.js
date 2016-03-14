/**
 * Main application file
 */

'use strict';

var _ = require('lodash');

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (process.env.NODE_ENV === 'production') {
  _.merge(process.env, require('./config/local.env'));
}

var express = require('express');
var mongoose = require('mongoose');
var config = require('./config/environment');

function connect() {
  mongoose.connect(config.mongo.uri, config.mongo.options);
}

// Connect to database
var db = mongoose.connection;
db.on('error', function (err) {
  console.warn(err.name + ': ' + err.message + '. Trying again in 10 seconds...');
  setTimeout(connect, 10 * 1000);
});

db.on('open', function () {
  db.on('disconnected', function () {
    console.warn('DB connection lost. Trying to reconnect...');
  });
  db.on('reconnected', function () {
    console.log('DB connection re-established.');
  });

  // Populate DB with sample data
  if(config.seedDB) { require('./config/seed'); }

  // Setup server
  var Adaptor = require('./components/adaptor');
  var ObjectCache = require('./components/objectcache');
  var app = express();
  app.set('objectCache', new ObjectCache());
  app.set('roomCache', {});

  var server = require('http').createServer(app);
  var socketio = require('socket.io')(server, {
      path: '/socket.io'
  });
  var adaptor;
  var sockets = [];

  require('./config/socketio')(socketio);
  require('./config/express')(app);
  require('./routes')(app);

  server.on('connection', function (socket) {
      sockets.push(socket);
      socket.on('close', function () {
          sockets.splice(sockets.indexOf(socket), 1);
      });
  });

  // Start server
  server.listen(config.port, config.ip, function () {
    console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
    adaptor = new Adaptor(app, socketio, app.get('objectCache'));
  });

  function destroy() {
      adaptor.destroy(function () {
          console.log('All realtime clients disconnected.');
          app.get('objectCache').destroy(function () {
              console.log('All objects persisted to DB.');
              sockets.forEach(function (socket) {
                  socket.destroy();
              });
              server.close(function () {
                  console.log('HTTP server shut down.');
                  mongoose.disconnect(function () {
                      console.log('DB connection closed.');
                      console.log('Everything successfully shut down. Bye!');
                      process.exit();
                  });
              });
          });
      });
  }

  process.on("SIGTERM", destroy);
  process.on("SIGINT", destroy);
  // Expose app
  exports = module.exports = app;
});

connect();
