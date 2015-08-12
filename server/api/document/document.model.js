'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var storageTypes = ['webdav'];

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
  title:    String,
  created:  { type: Date, default: Date.now, required: true },
  date:     { type: Date, default: Date.now },
  creator:  { type: Schema.Types.ObjectId, ref: 'User' },
  editors:  { type: [{type: Schema.Types.ObjectId, ref: 'User'}], default: [] },
  chunks:   { type: [{type: Schema.Types.ObjectId, ref: 'DocumentChunk'}], default: [] },
  live:     { type: Boolean, default: false },
  provider: String,
  webdav:   {}
});

module.exports = {
    DocumentChunk: mongoose.model('DocumentChunk', DocumentChunk),
    Document:      mongoose.model('Document', DocumentSchema)
};
