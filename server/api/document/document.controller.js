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
    return res.send(201);
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

exports.overwrite = storage.overwrite || function (req, res) { return res.send(405); };

exports.getAccess = function (req, res) {
  Document.findById(req.params.id, function (err, document) {
    if (err) { return handleError(res, err); }
    if(!document) { return res.send(404); }
    var objectCache = req.app.get('objectCache'),
        access = (objectCache.isTracked(document) ?
          objectCache.getTrackedObject(document).access : document.access);

    return res.json(200, access);
  });
}

// Updates an existing access list in the DB.
exports.updateAccess = function(req, res) {
  Document.findById(req.params.id, function (err, document) {
    if (err) { return handleError(res, err); }
    if(!document) { return res.send(404); }
    var objectCache = req.app.get('objectCache');
    if (objectCache.isTracked(document)) {
      var trackedDoc = objectCache.getTrackedObject(document);
      trackedDoc.access = req.body;
      trackedDoc.markModified('access');
      return res.send(200);
    } else {
      document.access = req.body;
      document.save(function (err) {
        if (err) { return handleError(res, err); }
        return res.send(200);
      });
    }
  });
};

// Deletes a document from the DB.
exports.destroy = function(req, res) {
  function remove (document) {
    document.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  }

  Document.findById(req.params.id, function (err, document) {
    if(err) { return handleError(res, err); }
    if(!document) { return res.send(404); }
    var room = req.app.get('roomCache')[document._id];
    if (room) {
      room.destroy(function () {
        return remove(document);
      })
    } else {
      return remove(document);
    }
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
