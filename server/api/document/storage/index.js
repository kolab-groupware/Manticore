'use strict';

var config = require('../../../config/environment');
module.exports = require('./' + config.storage.type);
