'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var DocumentSchema = new Schema({
  name: String,
  created: { type: Date, default: Date.now, required: true },
  updated: Date,
  active: { type: Boolean, default: false, required: true },
  editors: { type: [{type: Schema.Types.ObjectId, ref: 'User'}], default: [] }
});

module.exports = mongoose.model('Document', DocumentSchema);
