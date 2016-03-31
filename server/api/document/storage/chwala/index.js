'use strict';

var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var https = require('https');
var fs = require('fs');
var url = require('url');
var path = require('path');
var Grid = require('gridfs-stream');
var multer = require('multer');
var request = require('request');
var querystring = require('querystring');
var crypto = require('crypto');

var config = require('../../../../config/environment');

var User = require('../../../user/user.model');
var Document = require('../../document.model').Document;
var DocumentChunk = require('../../document.model').DocumentChunk;
var Template = require('../../../template/template.model');

var gfs = Grid(mongoose.connection.db, mongoose.mongo);

var serverUrl = config.storage.chwala.server;

/**
 * Uses the auth encryption key key to decipher ldap password
 */
function decrypt(password) {
    var decipher = crypto.createDecipher('aes-256-cbc', config.auth.ldap.key);
    return decipher.update(password, 'base64', 'utf8') + decipher.final('utf8');
}

/**
 * Sends an authenticated request as a user (with their LDAP password), for a given
 * Chwala ID (uuid), and downloads that to a given GridFS file Id.
 */
function downloadToGridFS(user, uuid, fileId, cb) {
    var file = gfs.createWriteStream({
        _id: fileId,
        filename: uuid,
        mode: 'w',
        chunkSize: 1024 * 4,
        content_type: 'application/vnd.oasis.opendocument.text',
        root: 'fs'
    });

    request.get({
        url: serverUrl + '/' + uuid,
        auth: {
            user: user.ldap.username,
            pass: decrypt(user.ldap.password)
        }
    })
    .on('error', function (err) {
        cb(err);
    })
    .pipe(file);

    file.on('finish', cb);
}

/**
 * Sends an authenticated PUT request to Chwala to upload a file to a given Chwala ID.
 * The file is read from readStream.
 */

function uploadToServer(user, uuid, readStream, cb) {
    readStream.pipe(request.put({
        url: serverUrl + '/' + uuid,
        auth: {
            user: user.ldap.username,
            pass: decrypt(user.ldap.password)
        },
        headers: {
            'Content-Type': 'application/vnd.oasis.opendocument.text'
        }
    }, cb));
}

/**
 * Creates the first chunk for a Document by retrieving the ODT from Chwala into GridFS.
 */
function createFirstChunk(user, uuid, cb) {
    var chunkId = new mongoose.Types.ObjectId(),
        fileId = new mongoose.Types.ObjectId();

    var firstChunk = new DocumentChunk({
        _id: chunkId,
        snapshot: {
            fileId: fileId
        }
    });

    downloadToGridFS(user, uuid, fileId, function(err) {
        if (err) { return cb(err); }
        firstChunk.save(function (err) {
            cb(err, firstChunk);
        });
    });
}

/**
 * Lists the available documents that have the user as either the creator or an editor
 */
exports.index = function (req, res) {
    var userId = req.user._id;

    Document.find({
        '$or': [
            { 'creator': userId },
            { 'editors': { '$in': [userId] } }
        ]
    })
    .populate('creator', 'name email')
    .populate('editors', 'name email')
    .exec(function (err, documents) {
      if(err) { return handleError(res, err); }
      return res.json(200, documents);
    });
};

/**
 * Return the metadata of a Document with a given ID,
 * with the creators and editors' names/emails populated
 */
exports.show = function(req, res) {
  Document.findById(req.params.id)
  .populate('creator', 'name email')
  .populate('editors', 'name email')
  .exec(function (err, document) {
    if(err) { return handleError(res, err); }
    if(!document) { return res.send(404); }
    return res.json(document);
  });
};

/**
 * Creating a document from a template is not supported by the Chwala adapter,
 * as this is something handled on the Roundcube/Chwala side.
 */
exports.createFromTemplate = function (req, res) {
  return res.send(405);
};

/**
 * Handles an incoming POST request from Chwala to create a new document with
 * a given Chwala ID, title, and access list. If no such document exists already,
 * a first chunk for it is created by retrieving the ODT file from Chwala.
 */
exports.upload = function (req, res, next) {
  var id = req.body.id,
      title = req.body.title,
      access = req.body.access;

  Document.findById(id, function (err, document) {
    if (err) { return handleError(res, err); }
    if (document) { return res.json(422, document); }

    createFirstChunk(req.user, id, function (err, firstChunk) {
      if (err) { return handleError(res, err); }
      Document.create({
        _id:     id,
        title:   title,
        creator: req.user._id,
        chunks:  [firstChunk._id],
        access: access
      }, function (err, document) {
        if (err) { return handleError(res, err); }
        next();
      });
    });
  });
};

/**
 * When a PUT request comes with a given Chwala ID, it means the intention is to
 * override the Manticore copy with a completely new version of the document, because
 * it was perhaps modified by other means unkown to Manticore. So a new first chunk is
 * created and we stop tracking the old chunks.
 */
exports.overwrite = function (req, res) {
  Document.findById(req.params.id, function (err, document) {
    if (err) { return handleError(res, err); }
    if (!document) { return res.json(404, document); }

    createFirstChunk(req.user, req.params.id, function (err, newFirstChunk) {
      if (err) { return handleError(res, err); }
      document.date = Date.now();
      document.chunks = [newFirstChunk]
      document.markModified('chunks');
      document.save(function (err, document) {
        if (err) { return handleError(res, err); }
        return res.send(200);
      });
    });
  });
}

/**
 * Creates a new chunk from an in-memory document snapshot (most likely the current one),
 * writes it to GridFS, streams it back to Chwala via a PUT request, and once that succeeds,
 * creates a new chunk to track the file and appends it to the DB entry. 
 */
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

    writeStream.end(new Buffer(snapshot.data), function () {
        User.findById(document.creator._id, function (err, user) {
            if (err) { return cb(err); }
            uploadToServer(
                user,
                document._id,
                gfs.createReadStream({ _id: fileId }),
                function (err, response) {
                    if (err) { return cb(err); }
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
                }
            );
        });
    });
};

function handleError(res, err) {
    console.log(err);
    return res.send(500, err);
}
