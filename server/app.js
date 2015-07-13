/**
 * Main application file
 */

'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express');
var mongoose = require('mongoose');
var config = require('./config/environment');
var Adaptor = require('./components/adaptor');
var ObjectCache = require('./components/objectcache');

// Connect to database
mongoose.connect(config.mongo.uri, config.mongo.options);

// Populate DB with sample data
if(config.seedDB) { require('./config/seed'); }

// Setup server
var app = express();
var server = require('http').createServer(app);
var socketio = require('socket.io')(server, {
    path: '/socket.io'
});
var adaptor;
var objectCache;
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
  objectCache = new ObjectCache();
  adaptor = new Adaptor(app, socketio, objectCache);
});

function destroy() {
    adaptor.destroy(function () {
        console.log('All realtime clients disconnected.');
        objectCache.destroy(function () {
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
