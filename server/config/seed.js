/**
 * Populate DB with sample data on first run
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';

var Document = require('../api/document/document.model').Document;
var DocumentChunk = require('../api/document/document.model').DocumentChunk;
var User = require('../api/user/user.model');

// Create an administrator if there isn't any
User.findOne({role: 'admin'}, function (err, admin) {
    if (!admin) {
        User.create({
            provider: 'local',
            role: 'admin',
            name: 'Administrator',
            email: 'admin@admin.com',
            password: 'admin'
        }, function () {
            console.log('Created Administrator with username "admin" and password "admin", make sure to change the password ASAP.');
        });
    }
});
