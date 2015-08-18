'use strict';

var _ = require('lodash');
var dav = require('dav');
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

var config = require('../../../../config/environment');

var User = require('../../../user/user.model');
var Document = require('../../document.model').Document;
var DocumentChunk = require('../../document.model').DocumentChunk;
var Template = require('../../../template/template.model');

var gfs = Grid(mongoose.connection.db, mongoose.mongo);

function makeDavClient (user) {
    return new dav.Client(
        new dav.transport.Basic(new dav.Credentials({
            username: user.webdav.username,
            password: user.webdav.password
        })),
        {
            baseUrl: config.storage.server
        }
    );
}

function saveToGridFS(user, href, fileId, cb) {
    var file = gfs.createWriteStream({
        _id: fileId,
        filename: href.split('/').pop(),
        mode: 'w',
        chunkSize: 1024 * 4,
        content_type: 'application/vnd.oasis.opendocument.text',
        root: 'fs'
    });

    request.get({
        url: config.storage.server + href,
        auth: {
            user: user.webdav.username,
            pass: user.webdav.password,
        }
    })
    .on('error', function (err) {
        cb(err);
    })
    .pipe(file);

    file.on('finish', cb);
}

function makeContentId(webdavDoc) {
    return webdavDoc.props.getetag + webdavDoc.props.getlastmodified;
}

// The WebDAV server is always authoritative.
function synchronizeUserFilesToDB(user, webdavDocuments, objectCache, cb) {
    Document.find({
        '$or': [
            { 'creator': user._id },
            { 'editors': { '$in': [user._id] } }
        ]
    })
    .populate('creator', 'name email').exec(function (err, dbDocuments) {
        // Since we're doing things that could possibly invalidate DB documents,
        // we have to work with the live cache
        var persistenceQueue = [];
        var finalDocuments = [];

        dbDocuments.forEach(function (dbDoc) {
            var trackedDoc;
            if (dbDoc.creator._id.equals(user._id)) {
                trackedDoc = objectCache.getTrackedObject(dbDoc);
                finalDocuments.push(trackedDoc);
            } else {
                finalDocuments.push(dbDoc);
                return;
            }

            var sameHrefDoc = _.find(webdavDocuments, function (doc) {
                return doc.href === trackedDoc.webdav.href;
            });
            var sameContentDoc = _.find(webdavDocuments, function (doc) {
                return makeContentId(doc) === trackedDoc.webdav.contentId;
            });

            if (!sameContentDoc) {
                if (!sameHrefDoc) {
                    // Document has been effectively deleted, take it offline and remove
                    trackedDoc.live = false;
                    persistenceQueue.push(function (cb) { trackedDoc.remove(cb); });
                    finalDocuments.pop();
                } else {
                    // Document has been modified, take it offline, throw away local changes, and update content ID
                    trackedDoc.live = false;
                    trackedDoc.chunks.length = 0;
                    trackedDoc.markModified('chunks');
                    trackedDoc.webdav.contentId = makeContentId(sameHrefDoc);
                    trackedDoc.date = Date.parse(sameHrefDoc.props.getlastmodified);
                    trackedDoc.markModified('webdav');
                    persistenceQueue.push(function (cb) { trackedDoc.save(cb); });
                }
            } else {
                if (!sameHrefDoc) {
                    // Document has been moved, just update href and save without interrupting anything
                    trackedDoc.webdav.href = sameContentDoc.href;
                    trackedDoc.markModified('webdav');
                    persistenceQueue.push(function (cb) { trackedDoc.save(cb); });
                } else {
                    if (makeContentId(sameHrefDoc) === makeContentId(sameContentDoc)) {
                        // nothing changed
                    } else {
                        // Document moved to sameContentDoc.props.href and there is a new doc at sameHrefDoc.href
                        trackedDoc.webdav.href = sameContentDoc.href;
                        trackedDoc.markModified('webdav');
                        persistenceQueue.push(function (cb) { trackedDoc.save(cb); });
                    }
                }
            }
        });

        // Once modified documents are persisted, purge non-live documents from the cache
        async.parallel(persistenceQueue, function (err) {
            if (err) return cb(err);

            dbDocuments.forEach(function (dbDoc) {
                if (objectCache.isTracked(dbDoc) && !dbDoc.live) {
                    objectCache.forgetTrackedObject(dbDoc);
                }
            });

            return cb(null, finalDocuments);
        });
    });
}

exports.index = function (req, res) {
    var davClient = makeDavClient(req.user);

    // Retrieve a list of files and filter by mimetype
    davClient.send(dav.request.propfind({
        depth: 'infinity',
        props: [
            { name: 'getcontenttype', namespace: dav.ns.DAV },
            { name: 'getetag', namespace: dav.ns.DAV },
            { name: 'getlastmodified', namespace: dav.ns.DAV }
        ]
    }), config.storage.path)
    .then(
    function success(response) {
        var webdavDocuments = _(response)
        .filter(function (item) {
            return item.props.getcontenttype === 'application/vnd.oasis.opendocument.text';
        })
        .map(function (item) {
            item.href = querystring.unescape(item.href);
            return item;
        })
        .value();

        synchronizeUserFilesToDB(req.user, webdavDocuments, req.app.get('objectCache'), function (err, updatedDocuments) {
            if (err) return handleError(res, err);
            // Transform the webdavDocuments array into something more usable
            // The fake ID of this document is represented as a combination of it's href and content id
            webdavDocuments = webdavDocuments.map(function (doc) {
                return {
                    _id:        new Buffer(doc.href + '__' + makeContentId(doc)).toString('base64'),
                    title:      doc.href.split('/').pop(),
                    creator:    req.user.profile,
                    date:       Date.parse(doc.props.getlastmodified),
                    webdav: {
                        href: doc.href,
                        contentId: makeContentId(doc)
                    }
                };
            });
            // Merge the two document types, such that hrefs are unique in the resulting list. DB docs have priority here
            var mergedDocuments = _.uniq(updatedDocuments.concat(webdavDocuments), function (doc) {
                return (doc.webdav && doc.webdav.contentId) || makeContentId(doc);
            });
            return res.json(200, mergedDocuments);
        });
    },
    function failure(error) {
        handleError(res, error);
    });
};

function createFirstChunk(user, href, cb) {
    var chunkId = new mongoose.Types.ObjectId(),
        fileId = new mongoose.Types.ObjectId();

    var firstChunk = new DocumentChunk({
        _id: chunkId,
        snapshot: {
            fileId: fileId
        }
    });

    saveToGridFS(user, href, fileId, function(err) {
        if (err) { return cb(err); }
        firstChunk.save(function (err) {
            cb(err, firstChunk);
        });
    });
}

exports.show = function(req, res) {
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        Document.findById(req.params.id, function (err, document) {
            if(err) { return handleError(res, err); }
            if(!document) { return res.send(404); }
            if (document.chunks.length) { return res.json(200, document); }
            // If the document had been invalidated, it has no chunks, so generate one
            createFirstChunk(req.user, document.webdav.href, function (err, firstChunk) {
                if (err) { return handleError(res, err); }
                document.chunks.push(firstChunk);
                document.save(function () {
                    res.json(200, document);
                })
            });
        });
    } else {
        var identifier = new Buffer(req.params.id, 'base64').toString('ascii').split('__'),
            href = identifier[0],
            contentId = identifier[1];
        Document.findOne({
            'webdav.contentId': contentId,
        }, function (err, document) {
            if (err) { return handleError(res, err); }
            if (document) {
                return res.json(200, document);
            } else {
                var davClient = makeDavClient(req.user);
                davClient.send(dav.request.propfind({ props: [] }), href)
                .then(
                function success(response) {
                    var webdavDoc = response[0];
                    createFirstChunk(req.user, href, function(err, firstChunk) {
                        if (err) { return handleError(res, err); }
                        Document.create({
                            title:      href.split('/').pop(),
                            creator:    req.user._id,
                            created:    Date.parse(webdavDoc.props.getlastmodified),
                            date:       Date.parse(webdavDoc.props.getlastmodified),
                            chunks:     [firstChunk._id],
                            webdav: {
                                href: href,
                                contentId: makeContentId(webdavDoc)
                            }
                        }, function (err, document) {
                            if (err) { return handleError(res, err); }
                            res.json(201, document);
                        });
                    })
                },
                function failure(error) {
                    res.send(404, error);
                });
            }
        });
    }
};

function uploadToServer(user, readStream, href, replace, cb) {
    var nonConflictingPath;

    function upload () {
        readStream.pipe(request.put({
            url: nonConflictingPath,
            auth: {
                user: user.webdav.username,
                pass: user.webdav.password,
            },
            headers: {
                'Content-Type': 'application/vnd.oasis.opendocument.text'
            }
        }, cb));
    }

    if (replace) {
        nonConflictingPath = config.storage.server + href;
        upload();
    } else {
        makeDavClient(user).send(dav.request.propfind({
            depth: 1,
            props: [
                { name: 'getcontenttype', namespace: dav.ns.DAV },
                { name: 'getetag', namespace: dav.ns.DAV },
                { name: 'getlastmodified', namespace: dav.ns.DAV }
            ]
        }), path.dirname(href))
        .then(
        function success(response) {
            function makePath(dir, basename, ext) {
                return dir + '/' + basename + ext;
            }

            var files = _(response)
            .filter(function (item) {
                return item.props.getcontenttype === 'application/vnd.oasis.opendocument.text';
            }).map(function (item) {
                item.href = querystring.unescape(item.href);
                return item;
            }).value();

            var iteration = 0,
                extension = path.extname(href),
                basename = path.basename(href, extension),
                basename_i = basename,
                dirname = path.dirname(href);

            for (var i = 0; i < files.length; i++) {
                if (files[i].href === makePath(dirname, basename_i, extension)) {
                    iteration++;
                    basename_i = basename + ' (' + iteration + ')';
                    i = -1;
                }
            }

            nonConflictingPath = config.storage.server + makePath(dirname, basename_i, extension);
            upload();
        },
        function failure(err) {
            cb(err);
        });
    }
}

exports.upload = function (req, res, next) {
    multer({
        upload: null,
        limits: {
            fileSize: 1024 * 1024 * 20, // 20 Megabytes
            files: 5
        },
        onFileUploadComplete: function (file) {
            uploadToServer(req.user,
                fs.createReadStream(file.path),
                config.storage.path + '/' + file.originalname,
                false,
                function (err) {
                    if (err) { console.log (err); }
                }
            );
        }
    })(req, res, next);
};

exports.createFromTemplate = function (req, res) {
  Template.findById(req.params.id, function (err, template) {
      if (err) { return handleError(res, err); }
      if (!template) { return res.send(404); }

      var chunkId = new mongoose.Types.ObjectId();

      var firstChunk = new DocumentChunk({
          _id: chunkId,
          snapshot: {
              fileId: template.fileId
          }
      });
      var newDocument = new Document({
          title: template.title,
          creator: req.user._id,
          chunks: [chunkId]
      });

      uploadToServer(
          req.user,
          gfs.createReadStream({ _id: template.fileId }),
          config.storage.path + '/' + template.title + '.odt',
          false,
          function (err, response) {
              if (err) { return handleError(res.err); }
              newDocument.webdav = {
                  href: response.request.uri.path,
                  contentId: response.headers.etag + response.headers.date
              };

              firstChunk.save(function (err) {
                  if (!err) {
                      newDocument.save(function (err) {
                          return res.json(201, newDocument);
                      });
                  }
              });
          }
      );

  });
};

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
                gfs.createReadStream({ _id: fileId }),
                document.webdav.href,
                true,
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
                    document.webdav.contentId = response.headers.etag + response.headers.date;
                    document.chunks.push(chunkId);
                    document.markModified('chunks');
                    cb(null, chunk);
                });
            });
        });
    });
};

function handleError(res, err) {
    console.log(err);
    return res.send(500, err);
}
