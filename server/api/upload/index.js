'use strict';

var express = require('express');
var multer = require('multer');
var _ = require('lodash');
var Grid = require('gridfs-stream');
var mongoose = require('mongoose');

var auth = require('../../auth/auth.service');
var DocumentChunk = require('../document/document.model').DocumentChunk;
var Document = require('../document/document.model').Document;

var gfs = Grid(mongoose.connection.db, mongoose.mongo);
var router = express.Router();

router.post('/', auth.isAuthenticated(), function (req, res, next) {
    multer({
        upload: null,
        limits: {
            fileSize: 1024 * 1024 * 20, // 20 Megabytes
            files: 5
        },
        onFileUploadStart: function (file) {
            var firstChunk = new DocumentChunk();
            var newDocument = new Document({
                title: file.originalname,
                creator: req.user._id,
                chunks: [firstChunk._id]
            });
            this.upload = gfs.createWriteStream({
                _id: mongoose.Types.ObjectId(firstChunk._id),
                filename: file.originalname,
                mode: 'w',
                chunkSize: 1024 * 4,
                content_type: file.mimetype,
                root: 'fs'
            });
            this.upload.on('finish', function () {
                firstChunk.save(function (err) {
                    if (!err) {
                        newDocument.save();
                    }
                });
            });
        },
        onFileUploadData: function (file, data) {
            this.upload.write(data);
        },
        onFileUploadComplete: function (file) {
            this.upload.end();
        }
    })(req, res, next);
}, function (req, res) {
    res.status(200).send("OK");
});

module.exports = router;
