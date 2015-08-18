'use strict';

var multer = require('multer');
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');

var Document = require('../../document.model').Document;
var DocumentChunk = require('../../document.model').DocumentChunk;
var Template = require('../../../template/template.model');

var gfs = Grid(mongoose.connection.db, mongoose.mongo);

exports.index = function (req, res) {
    var userId = req.user._id;

    Document.find({
        '$or': [
            { 'creator': userId },
            { 'editors': { '$in': [userId] } }
        ]
    }).populate('creator', 'name email').exec(function (err, documents) {
      if(err) { return handleError(res, err); }
      return res.json(200, documents);
    });
};

exports.show = function(req, res) {
    Document.findById(req.params.id, function (err, document) {
        if(err) { return handleError(res, err); }
        if(!document) { return res.send(404); }
        return res.json(document);
    });
};

exports.upload = function (req, res, next) {
    multer({
        upload: null,
        limits: {
            fileSize: 1024 * 1024 * 20, // 20 Megabytes
            files: 5
        },
        onFileUploadStart: function (file) {
            var chunkId = new mongoose.Types.ObjectId(),
                fileId = new mongoose.Types.ObjectId();

            var firstChunk = new DocumentChunk({
                _id: chunkId,
                snapshot: {
                    fileId: fileId
                }
            });
            var newDocument = new Document({
                title: file.originalname,
                creator: req.user._id,
                chunks: [chunkId]
            });
            this.upload = gfs.createWriteStream({
                _id: fileId,
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
};


exports.createFromTemplate = function (req, res) {
  Template.findById(req.params.id, function (err, template) {
      if (err) { return handleError(res, err); }
      if (!template) { return res.send(404); }

      var chunkId = new mongoose.Types.ObjectId();

      var firstChunk = new DocumentChunk({
          _id: chunkId,
          snapshot: {
              fileId: template.fileId
          }
      });
      var newDocument = new Document({
          title: template.title,
          creator: req.user._id,
          chunks: [chunkId]
      });

      firstChunk.save(function (err) {
          if (!err) {
              newDocument.save(function (err) {
                  return res.json(201, newDocument);
              });
          }
      })
  });
};

exports.createChunkFromSnapshot = function (document, snapshot, cb) {
    var chunkId = new mongoose.Types.ObjectId(),
        fileId = new mongoose.Types.ObjectId();

    var writeStream = gfs.createWriteStream({
        _id: fileId,
        filename: document.title + '_' + Date.now(),
        mode: 'w',
        chunkSize: 1024 * 4,
        content_type: 'application/vnd.oasis.opendocument.text',
        root: 'fs'
    });

    writeStream.write(new Buffer(snapshot.data), function () {
        writeStream.end(function () {
            var chunk = new DocumentChunk({
                _id: chunkId,
                sequence: snapshot.sequence,
                snapshot: {
                    fileId: fileId,
                    operations: snapshot.operations
                }
            });
            chunk.save(function (err) {
                if (err) { return cb(err); }
                document.chunks.push(chunkId);
                document.markModified('chunks');
                cb(null, chunk);
            });
        });
    });
};

function handleError(res, err) {
  return res.send(500, err);
}
