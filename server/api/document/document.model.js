'use strict';

var _ = require('lodash'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var config = require('../../config/environment');

var storageTypes = ['webdav', 'chwala'];

/*
 * Each DocumentChunk has an associated ODF snapshot file within
 * GridFS, a list of operations required to bring the snapshot into
 * a workable initial state for the chunk, and a list of operations
 * that signifies the edit history after the aforementioned document
 * state
 */
var DocumentChunk = new Schema({
    sequence: { type: Number, default: 0 },
    snapshot: {
        fileId: { type: Schema.Types.ObjectId, required: true },
        operations: { type: Array, default: [] }
    },
    operations: { type: Array, default: [] }
});

var DocumentSchema = new Schema({
  _id:      { type: Schema.Types.String, default: mongoose.Types.ObjectId, unique: true },
  title:    String,
  created:  { type: Date, default: Date.now, required: true },
  date:     { type: Date, default: Date.now },
  creator:  { type: Schema.Types.ObjectId, ref: 'User' },
  editors:  { type: [{type: Schema.Types.ObjectId, ref: 'User'}], default: [] },
  chunks:   { type: [{type: Schema.Types.ObjectId, ref: 'DocumentChunk'}], default: [] },
  live:     { type: Boolean, default: false },
  provider: String,
  webdav:   {},
  chwala:   {},
  access:   { type: [{ identity: String, permission: { type: String, enum: ['read', 'write', 'deny' ]}}], default: [] }
});

DocumentSchema.methods = {
  /** Potentially unsafe */
  getAccessType: function (identity) {
    return _.result(_.find(this.access, function (accessItem) {
      return _.isEqual(accessItem.identity, identity);
    }), 'permission') || config.defaultAccess || 'deny';
  }
};

// DocumentSchema
//   .path('access')
//   .validate(function(access) {
//     return _.find(this.access, function (accessItem) {
//       return _.includes(['read, write', 'deny']permission !== 'read'
//     });
//   }, 'Invalid access control info');

module.exports = {
    DocumentChunk: mongoose.model('DocumentChunk', DocumentChunk),
    Document:      mongoose.model('Document', DocumentSchema)
};
