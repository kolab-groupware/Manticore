'use strict';

var express = require('express');
var controller = require('./document.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.isAuthenticated(), controller.index);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.get('/snapshot/:id', controller.showSnapshot)
router.get('/fromTemplate/:id', auth.isAuthenticated(),
    controller.createFromTemplate);
router.post('/', auth.isAuthenticated(), controller.upload,
    controller.acknowledgeUpload);
router.put('/:id', auth.isAuthenticated(), controller.overwrite);
router.get('/:id/access', auth.isAuthenticated(), controller.getAccess);
router.put('/:id/access', auth.isAuthenticated(), controller.updateAccess);
router.delete('/:id', auth.isAuthenticated(), controller.destroy);

module.exports = router;
