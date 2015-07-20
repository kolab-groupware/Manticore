/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /documents              ->  index
 * POST    /documents              ->  create
 * GET     /documents/:id          ->  show
 * PUT     /documents/:id          ->  update
 * DELETE  /documents/:id          ->  destroy
 */

'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');
var multer = require('multer');

var DocumentChunk = require('./document.model').DocumentChunk;
var Document = require('./document.model').Document;
var Template = require('../template/template.model');

var gfs = Grid(mongoose.connection.db, mongoose.mongo);

// Get list of documents
exports.index = function(req, res) {
  Document.find().populate('creator').exec(function (err, documents) {
    if(err) { return handleError(res, err); }
    return res.json(200, documents);
  });
};

// Get a single document
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
                fileId: fileId
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

exports.acknowledgeUpload = function (req, res) {
    return res.send(200);
};

exports.showSnapshot = function(req, res) {
    var snapshotId = req.params.id;

    gfs.findOne({_id: snapshotId}, function (err, file) {
        if (err) { return handleError(res, err); }
        if (!file) { return res.send(404); }

        var download = gfs.createReadStream({
            _id: snapshotId
        });
        download.on('error', function (err) {
            return handleError(res, err);
        });
        res.set('Content-Type', file.contentType);
        res.attachment(file.filename)
        download.pipe(res);
    });
};

// Creates a new document in the DB.
exports.create = function(req, res) {
  Document.create(req.body, function(err, document) {
    if(err) { return handleError(res, err); }
    return res.json(201, document);
  });
};

exports.createFromTemplate = function (req, res) {
  Template.findById(req.params.id, function (err, template) {
      if (err) { return handleError(res, err); }
      if (!template) { return res.send(404); }

      var chunkId = new mongoose.Types.ObjectId();

      var firstChunk = new DocumentChunk({
          _id: chunkId,
          fileId: template.fileId
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

// Updates an existing document in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Document.findById(req.params.id, function (err, document) {
    if (err) { return handleError(res, err); }
    if(!document) { return res.send(404); }
    var updated = _.merge(document, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, document);
    });
  });
};

// Deletes a document from the DB.
exports.destroy = function(req, res) {
  Document.findById(req.params.id, function (err, document) {
    if(err) { return handleError(res, err); }
    if(!document) { return res.send(404); }
    document.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
