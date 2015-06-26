/**
 * Populate DB with sample data on server start
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';

var Document = require('../api/document/document.model').Document;
var DocumentChunk = require('../api/document/document.model').DocumentChunk;
var User = require('../api/user/user.model');

DocumentChunk.find({}).remove(function() {
    Document.find({}).remove(function() {
    });
});

User.find({}).remove(function() {
  User.create({
    provider: 'local',
    name: 'Test User',
    email: 'test@test.com',
    password: 'test'
  }, {
    provider: 'local',
    role: 'admin',
    name: 'Admin',
    email: 'admin@admin.com',
    password: 'admin'
  }, function() {
      console.log('finished populating users');
    }
  );
});
