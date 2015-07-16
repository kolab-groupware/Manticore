'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TemplateSchema = new Schema({
  title: String,
  description: String
 });

module.exports = mongoose.model('Template', TemplateSchema);
