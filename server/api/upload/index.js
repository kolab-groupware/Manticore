'use strict';

var express = require('express');
var multer = require('multer');
var _ = require('lodash');
var Grid = require('gridfs-stream');
var mongoose = require('mongoose');
var Document = require('../document/document.model');


var gfs = Grid(mongoose.connection.db, mongoose.mongo);
var router = express.Router();

router.post('/', function (req, res, next) { console.log('here'); next(); }, multer({
    upload: null,
    limits: {
        fileSize: 1024 * 1024 * 20, // 20 Megabytes
        files: 5
    },
    onFileUploadStart: function (file) {
        var newDocument = new Document({
            name: file.originalname
        });
        this.upload = gfs.createWriteStream({
            _id: mongoose.Types.ObjectId(newDocument._id),
            filename: file.originalname,
            mode: 'w',
            chunkSize: 1024 * 4,
            content_type: file.mimetype,
            root: 'fs'
        });
        this.upload.on('finish', function () {
            newDocument.save();
        });
    },
    onFileUploadData: function (file, data) {
        this.upload.write(data);
    },
    onFileUploadComplete: function (file) {
        this.upload.end();
    }
}), function (req, res) {
    res.status(200).send("OK");
});

module.exports = router;
