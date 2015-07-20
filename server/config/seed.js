/**
 * Populate DB with sample data on first run
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';

var fs = require('fs');
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');
var gfs = Grid(mongoose.connection.db, mongoose.mongo);

var Document = require('../api/document/document.model').Document;
var DocumentChunk = require('../api/document/document.model').DocumentChunk;
var User = require('../api/user/user.model');
var Template = require('../api/template/template.model');

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

Template.findOne({}, function (err, template) {
    if (!template) {
        var templateFileId = new mongoose.Types.ObjectId();

        var newTemplate = new Template({
            title: 'Text Document',
            description: 'A blank document with a basic set of styles.',
            fileId: templateFileId
        });

        var writeStream = gfs.createWriteStream({
            _id: templateFileId,
            filename: 'template.odt',
            mode: 'w',
            chunkSize: 1024 * 4,
            content_type: 'application/vnd.oasis.opendocument.text',
            root: 'fs'
        });

        require('fs')
            .createReadStream(__dirname + '/resources/template.odt')
            .pipe(writeStream);

        writeStream.on('finish', function () {
            newTemplate.save(function () {
                console.log('Create template "Text Document" from fallback configuration.')
            });
        });
    }
});
