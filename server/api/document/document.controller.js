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

var storage = require('./storage');

var DocumentChunk = require('./document.model').DocumentChunk;
var Document = require('./document.model').Document;
var Template = require('../template/template.model');

var gfs = Grid(mongoose.connection.db, mongoose.mongo);

// Get list of documents
exports.index = storage.index;

// Get a single document
exports.show = storage.show;

// Middleware for handling file uploads
exports.upload = storage.upload;

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

exports.createFromTemplate = storage.createFromTemplate;

exports.createChunkFromSnapshot = storage.createChunkFromSnapshot;

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
