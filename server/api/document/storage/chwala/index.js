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

function decrypt(password) {
    var decipher = crypto.createDecipher('aes-256-cbc', config.auth.ldap.key);
    return decipher.update(password, 'base64', 'utf8') + decipher.final('utf8');
}

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

exports.createFromTemplate = function (req, res) {
  return res.send(405);
};

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
