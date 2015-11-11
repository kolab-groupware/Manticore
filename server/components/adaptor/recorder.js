var phantom = require('phantom');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var config = require('../../config/environment');

var Recorder = function (lastChunk, cb) {
    var self = this,
        manticoreHost = 'http://' + (config.ip || 'localhost') + ':' + config.port,
        baseSnapshotUrl = manticoreHost + '/api/documents/snapshot/' + lastChunk.snapshot.fileId,
        emitter = new EventEmitter(),
        snapshotReadyCb = function () {},
        ph,
        page;

    function phantomCallback(data) {
        function documentLoaded(data) {
            cb();
        }
        switch(data.event) {
            case 'log': console.log('PhantomJS Log :', data.message); break;
            case 'documentLoaded': documentLoaded(data); break;

            default: emitter.emit(data.event, data);
        }
    }

    /* jshint ignore:start */
    function loadDocument(url, sequence, operations) {
        window.console.log = function (message) {
            window.callPhantom({event: 'log', message: message});
        };

        var odfElement = document.getElementById('odf');
        document.odfCanvas = new odf.OdfCanvas(odfElement);
        document.odfCanvas.addListener('statereadychange', function () {
            // The "sequence" is the number of ops executed so far in the canonical document history
            window.sequence = sequence;
            document.session = new ops.Session(document.odfCanvas);
            document.odtDocument = document.session.getOdtDocument();

            var operationRouter = new ops.OperationRouter();
            operationRouter.push = function (opspecs) {
                var op, i;
                if (!opspecs.length) { return; }
                for (i = 0; i < opspecs.length; i++) {
                    op = document.session.getOperationFactory().create(opspecs[i]);
                    if (op && op.execute(document.session.getOdtDocument())) {
                        window.sequence++;
                        // console.log('Just executed op ' + opspecs[i].optype + 'by ' + opspecs[i].memberid);
                    } else {
                        break;
                    }
                }
            };
            document.session.setOperationRouter(operationRouter);
            document.session.enqueue(operations);
            window.callPhantom({event: 'documentLoaded'});
        });
        document.odfCanvas.load(url);
    }
    /* jshint ignore:end */

    this.push = function (operations, cb) {
        page.evaluate(function (opspecs) {
            document.session.enqueue(opspecs);
        }, function () { cb(); }, operations);
    };


    this.getSnapshot = function (cb) {
        var eventId = Date.now();
        emitter.once('snapshotReady' + eventId, function (data) {
            cb(data);
        });

        page.evaluate(function (eventId) {
            var doc = document.odtDocument,
                ops = [];

            doc.getMemberIds().forEach(function (memberId) {
                ops.push({
                    optype: 'AddMember',
                    timestamp: Date.now(),
                    memberid: memberId,
                    setProperties: doc.getMember(memberId).getProperties()
                });
                var cursor = doc.getCursor(memberId);
                if (cursor) {
                    var selection = doc.getCursorSelection(memberId);
                    ops.push({
                        optype: 'AddCursor',
                        timestamp: Date.now(),
                        memberid: memberId
                    });
                    ops.push({
                        optype: 'MoveCursor',
                        timestamp: Date.now(),
                        memberid: memberId,
                        position: selection.position,
                        length: selection.length,
                        selectionType: cursor.getSelectionType()
                    });
                }
            });

            document.odfCanvas.odfContainer().createByteArray(function (data) {
                window.callPhantom({
                    event: 'snapshotReady' + eventId,
                    operations: ops,
                    data: data,
                    sequence: window.sequence
                });
            });
        }, function () {}, eventId);
    };

    this.destroy = function (cb) {
        ph.exit();
        cb();
    };


    function init() {
        phantom.create('--web-security=no', function (instance) {
            ph = instance;
            ph.createPage(function (p) {
                p.open('file://' + __dirname + '/odf.html?host=' + manticoreHost, function (status) {
                    if (status === 'success') {
                        page = p;
                        page.set('onCallback', phantomCallback);
                        page.evaluate(loadDocument, function (){},
                            baseSnapshotUrl,
                            lastChunk.sequence - lastChunk.snapshot.operations.length,
                            lastChunk.snapshot.operations.concat(lastChunk.operations));
                    } else {
                        return cb(new Error('Could not initialize recorder module.'));
                    }
                });
            });
        });
    }
    init();
};

module.exports = Recorder;
