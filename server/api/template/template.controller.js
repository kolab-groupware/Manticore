'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');
var multer = require('multer');

var Template = require('./template.model');

var gfs = Grid(mongoose.connection.db, mongoose.mongo);

// Get list of templates
exports.index = function(req, res) {
  Template.find(function (err, templates) {
    if(err) { return handleError(res, err); }
    return res.json(200, templates);
  });
};

// Get a single template
exports.show = function(req, res) {
  Template.findById(req.params.id, function (err, template) {
    if(err) { return handleError(res, err); }
    if(!template) { return res.send(404); }
    return res.json(template);
  });
};

exports.upload = function (req, res, next) {
    multer({
        upload: null,
        limits: {
            fileSize: 1024 * 1024 * 20, // 20 Megabytes
        },
        onFileUploadStart: function (file) {
            var templateId = new mongoose.Types.ObjectId();

            var newTemplate = new Template({
                _id: templateId,
                title: file.originalname
            });
            this.upload = gfs.createWriteStream({
                _id: templateId,
                filename: file.originalname,
                mode: 'w',
                chunkSize: 1024 * 4,
                content_type: file.mimetype,
                root: 'fs'
            });
            this.upload.on('finish', function () {
                newTemplate.save();
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

// Creates a new template in the DB.
exports.create = function(req, res) {
  Template.create(req.body, function(err, template) {
    if(err) { return handleError(res, err); }
    return res.json(201, template);
  });
};

// Updates an existing template in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Template.findById(req.params.id, function (err, template) {
    if (err) { return handleError(res, err); }
    if(!template) { return res.send(404); }
    var updated = _.merge(template, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, template);
    });
  });
};

// Deletes a template from the DB.
exports.destroy = function(req, res) {
  Template.findById(req.params.id, function (err, template) {
    if(err) { return handleError(res, err); }
    if(!template) { return res.send(404); }
    template.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
