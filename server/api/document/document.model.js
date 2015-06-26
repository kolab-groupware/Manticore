'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/*
 * Each Document Chunk has an associated ODF snapshot file within
 * GridFS of the same ID.
 */
var DocumentChunk = new Schema({
    operations: { type: Array, default: [] }
});

var DocumentSchema = new Schema({
  title:    String,
  created:  { type: Date, default: Date.now, required: true },
  creator:  { type: Schema.Types.ObjectId, ref: 'User' },
  editors:  { type: [{type: Schema.Types.ObjectId, ref: 'User'}], default: [] },
  chunks:   { type: [{type: Schema.Types.ObjectId, ref: 'DocumentChunk'}], required: true }
});

module.exports = {
    DocumentChunk: mongoose.model('DocumentChunk', DocumentChunk),
    Document:      mongoose.model('Document', DocumentSchema)
};
