/*
 * Copyright (C) 2015 KO GmbH <copyright@kogmbh.com>
 *
 * @licstart
 * This file is part of Kotype.
 *
 * Kotype is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License (GNU AGPL)
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * Kotype is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Kotype.  If not, see <http://www.gnu.org/licenses/>.
 * @licend
 *
 * @source: https://github.com/kogmbh/Kotype/
 */

var async = require("async");
var _ = require("lodash");
var RColor = require('../colors');
var DocumentChunk  = require("../../api/document/document.model").DocumentChunk;
var DocumentController = require("../../api/document/document.controller");

var Recorder = require('./recorder');

/**
 * Handles the adding/removal of members in an editing session, relays operations,
 * performs cleanup after dropouts, and talks to the client with socketio messages
 */
var Room = function (app, document, objectCache, cb) {
    var self = this;

    /**
     * Handles chunking of operations to a document - including retrieval
     * and appending of new ops across several chunks
     */
    var ChunkManager = function (seedChunk) {
        var serverSeq,
            chunks = [];

        /**
         * Starts at `seq` sequence number and returns an array of all operations
         * after that, spanning one or more chunks
         */
        function getOperationsAfter(seq) {
            var ops = [];

            for (var i = chunks.length - 1; i >= 0; i--) {
                if (chunks[i].sequence >= seq) {
                    ops = chunks[i].operations.concat(ops);
                } else {
                    var basedOn = seq - chunks[i].sequence;
                    ops = chunks[i].operations.slice(basedOn).concat(ops);
                    break;
                }
            }

            return ops;
        }
        this.getOperationsAfter = getOperationsAfter;

        function appendOperations(ops) {
            var lastChunk = getLastChunk();
            lastChunk.operations = lastChunk.operations.concat(ops);
            serverSeq += ops.length;
        }
        this.appendOperations = appendOperations;

        function appendChunk(chunk) {
            var trackedChunk = objectCache.getTrackedObject(chunk);
            chunks.push(trackedChunk);
            serverSeq = trackedChunk.sequence + trackedChunk.operations.length;
        }
        this.appendChunk = appendChunk;

        function getLastChunk() {
            return _.last(chunks);
        }
        this.getLastChunk = getLastChunk;

        this.getServerSequence = function () {
            return serverSeq;
        };

        appendChunk(seedChunk);
    };

    var chunkManager,
        recorder,
        hasCursor = {},
        sockets = [],
        userColorMap = {},
        randomColor = new RColor(),
        saveInProgress = false,
        isAvailable = false;

    /**
     * Synchronizes the title of the Document in the DB and any changes to the ODF
     * metadata title
     */
    function trackTitle(ops) {
        var newTitle, i;

        for (i = 0; i < ops.length; i += 1) {
            if (ops[i].optype === "UpdateMetadata" && ops[i].setProperties["dc:title"] !== undefined) {
                newTitle = ops[i].setProperties["dc:title"];
            }
        }

        if (newTitle !== undefined) {
            if (newTitle.length === 0) {
                newTitle = "Untitled Document";
            }
        }

        if (newTitle) {
            document.title = newTitle;
        }
    }

    /**
     * Synchronizes the list of people who have joined the session to The
     * `editors` field of the Document entry in the DB
     */
    function trackEditors() {
        // TODO: rather track by ops, to decouple from socket implementation
        sockets.forEach(function (socket) {
            var _id = socket.user._id;
            if (document.editors.indexOf(_id) === -1) {
                document.editors.push(_id);
            }
        });
    }

    /**
     * Inspects the array of operations and updates the hasCursor fields for each
     * user
     */
    function trackCursors(ops) {
        var i;

        for (i = 0; i < ops.length; i += 1) {
            if (ops[i].optype === "AddCursor") {
                hasCursor[ops[i].memberid] = true;
            }
            if (ops[i].optype === "RemoveCursor") {
                hasCursor[ops[i].memberid] = false;
            }
        }
    }

    /**
     * Removes all cursors and members in the correct order within the last chunk
     * It may have happen that a user drops out due to a connection loss, error, or
     * if Manticore is uncleanly terminated.
     * In that case, this function will make sure to remove their cursors from the
     * document and then remove the "member" via the relevant operations.
     */
    function sanitizeDocument() {
        var chunk = chunkManager.getLastChunk(),
            ops = chunk.snapshot.operations.concat(chunk.operations),
            unbalancedCursors = {},
            unbalancedMembers = {},
            lastAccessDate = document.date,
            newOps = [],
            i;

        for (i = 0; i < ops.length; i += 1) {
            if (ops[i].optype === "AddCursor") {
                unbalancedCursors[ops[i].memberid] = true;
            } else if (ops[i].optype === "RemoveCursor") {
                unbalancedCursors[ops[i].memberid] = false;
            } else if (ops[i].optype === "AddMember") {
                unbalancedMembers[ops[i].memberid] = true;
            } else if (ops[i].optype === "RemoveMember") {
                unbalancedMembers[ops[i].memberid] = false;
            }
        }

        Object.keys(unbalancedCursors).forEach(function (memberId) {
            if (unbalancedCursors[memberId]) {
                newOps.push({
                    optype: "RemoveCursor",
                    memberid: memberId,
                    timestamp: lastAccessDate
                });
            }
        });

        Object.keys(unbalancedMembers).forEach(function (memberId) {
            if (unbalancedMembers[memberId]) {
                newOps.push({
                    optype: "RemoveMember",
                    memberid: memberId,
                    timestamp: lastAccessDate
                });
            }
        });

        if (newOps.length) {
            // Update op stack
            chunkManager.appendOperations(newOps);
        }
    }

    /**
     * Broadcast a socketio message to all clients
     */
    function broadcastMessage(message, data) {
        sockets.forEach(function (peerSocket) {
            peerSocket.emit(message, data)
        });
    }

    /**
     * Send an array of operations to a given member, referred to by it's socket
     */
    function sendOpsToMember(socket, ops) {
        socket.emit("new_ops", {
            head: chunkManager.getServerSequence(),
            ops: ops
        });
    }

    /**
     * Sends an array of operations to a given member, which are necessary to
     * bring the snapshot provided to them to the latest state of the document
     */
    function setupMemberSnapshot(socket, snapshot) {
        socket.emit("replay", {
            head: chunkManager.getServerSequence(),
            ops: snapshot.operations.concat(chunkManager.getOperationsAfter(snapshot.sequence))
        });
    }

    /**
     * Send ops authored by a given member to all other members except that one
     */
    function broadcastOpsByMember(socket, ops) {
        if (!ops.length) {
            return;
        }
        sockets.forEach(function (peerSocket) {
            if (peerSocket.memberId !== socket.memberId) {
                sendOpsToMember(peerSocket, ops);
            }
        });
    }

    /**
     * Takes the array of incoming ops, plays them on the serverside live document,
     * and if the execution succeeds without errors, adds them to the document's latest chunk,
     * while making sure to update the relevant Document metadata based on the ops content
     */
    function writeOpsToDocument(ops, cb) {
        if (!ops.length || !document.live) {
            cb();
        }

        recorder.push(ops, function () {
            trackTitle(ops);
            trackEditors();

            // Update op stack
            chunkManager.appendOperations(ops);

            // Update modified date
            document.date = new Date();

            cb();
        });
    }

    /**
     * Assigns a unique WebODF memberId to a new user, and adds them to the document.
     * This lets the same user join the same session several times, for example through
     * different devices.
     * A random color is assigned to the member, and we try to make the color
     * sufficiently distinguishable from all the other colors present in the session
     */
    function addMember(user, cb) {
        var memberId,
            op,
            timestamp = Date.now(),
            color = userColorMap[user._id];

        memberId = user.name + "_" + timestamp.toString();
        // Let user colors persist in a Room even after they've
        // left and joined.
        if (!color) {
            userColorMap[user._id] = color = randomColor.get(true, 0.7);
        }

        op = {
            optype: "AddMember",
            memberid: memberId,
            timestamp: timestamp,
            setProperties: {
                fullName: user.name,
                email: user.email,
                color: color
            }
        };
        writeOpsToDocument([op], function () {
            cb(memberId, [op]);
        });
    }

    /**
     * Removes a user instance from the sessions, by first issuing an op
     * to remove their cursor, and then their member.
     */
    function removeMember(memberId, cb) {
        var ops = [],
            timestamp = Date.now();

        if (hasCursor[memberId]) {
            ops.push({
                optype: "RemoveCursor",
                memberid: memberId,
                timestamp: timestamp
            });
        }
        ops.push({
            optype: "RemoveMember",
            memberid: memberId,
            timestamp: timestamp
        });
        writeOpsToDocument(ops, function () {
            cb(ops);
        });
    }

    this.socketCount = function () {
        return sockets.length;
    };

    /**
     * Runs everything that's required bring a new socket up to speed on the
     * latest state of the document, byt adding their member to the session,
     * then extracting the latest snapshot from the PhantomJS recorder,
     * and serving that snapshot out as the editor's Genesis URL.
     */
    this.attachSocket = function (socket) {
        // Add the socket to the room and give the
        // client it's unique memberId
        addMember(socket.user, function (memberId, ops) {
            socket.memberId = memberId;
            sockets.push(socket);
            broadcastOpsByMember(socket, ops);

            // Generate genesis URL with the latest document version's snapshot
            // We use a two-time URL because WebODF makes two identical GET requests (!)
            var genesisUrl = '/genesis/' + Date.now().toString(),
                usages = 0;

            recorder.getSnapshot(function (snapshot) {
                var buffer = new Buffer(snapshot.data);
                app.get(genesisUrl, function (req, res) {
                    usages++;
                    res.set('Content-Type', 'application/vnd.oasis.opendocument.text');
                    res.attachment(document.title);
                    res.send(buffer);
                    var routes = app._router.stack;
                    if (usages === 2) {
                        buffer = null;
                        for (var i = 0; i < routes.length; i++) {
                            if (routes[i].path === genesisUrl) {
                                routes.splice(i, 1);
                                break;
                            }
                        }
                    }
                });

                /**
                 * Inform the client that the socket has joined the session and
                 * with the returned permission type, so they have enough info
                 * on how to initialize the editor
                 */
                socket.emit("join_success", {
                    memberId: memberId,
                    genesisUrl: genesisUrl,
                    permission: document.getAccessType(socket.user.email)
                });

                // Service replay requests
                socket.on("replay", function () {
                    setupMemberSnapshot(socket, snapshot);
                });

                // Store, analyze, and broadcast incoming commits
                socket.on("commit_ops", function (data, cb) {
                    var clientSeq = data.head,
                        ops = data.ops;
                    if (clientSeq === chunkManager.getServerSequence()) {
                        writeOpsToDocument(ops, function () {
                            cb({
                                conflict: false,
                                head: chunkManager.getServerSequence()
                            });
                            trackCursors(ops);
                            broadcastOpsByMember(socket, data.ops);
                        });
                    } else {
                        cb({
                            conflict: true
                        });
                    }
                });

                // Service save requests. A save is a commit +
                socket.on("save", function (cb) {
                    // Saves are blocking inside the phantomjs process, and they affect everyone,
                    // therefore use a lock.
                    if (saveInProgress) {
                        var checkIfSaved = setInterval(function () {
                            if (!saveInProgress) {
                                clearInterval(checkIfSaved);
                                cb();
                            }
                        }, 1000);
                    } else {
                        saveInProgress = true;
                        recorder.getSnapshot(function (snapshot) {
                            DocumentController.createChunkFromSnapshot(document, snapshot,
                            function (err, chunk) {
                                saveInProgress = false;
                                if (err) { return cb(err); }
                                chunkManager.appendChunk(chunk);
                                cb();
                            });
                        });
                    }
                });

                // Service various requests
                socket.on("access_get", function (data, cb) {
                    cb({
                        access: document.isPublic ? "public" : "normal"
                    });
                });

                if (socket.user.identity !== "guest") {
                    socket.on("access_change", function (data) {
                        document.isPublic = data.access === "public";
                        broadcastMessage("access_changed", {
                            access: data.access === "public" ? "public" : "normal"
                        });
                        if (data.access !== "public") {
                            sockets.forEach(function (peerSocket) {
                                if (peerSocket.user.identity === "guest") {
                                    console.log(peerSocket.user.name);
                                    removeSocket(peerSocket);
                                }
                            });
                        }
                    });
                }
            });

            // Handle dropout events
            socket.on("leave", function () {
                removeSocket(socket);
            });
            socket.on("disconnect", function () {
                removeSocket(socket);
            });
        });
    };

    function detachSocket(socket, callback) {
        removeMember(socket.memberId, function (ops) {
            broadcastOpsByMember(socket, ops);

            socket.removeAllListeners();

            function lastCB() {
                socket.removeAllListeners();
                if (callback) {
                    callback();
                }
            }
            // If a socket that is already connected is being
            // removed, this means that this is a deliberate
            // kicking-out, and not a natural event that could
            // result in a reconnection later. Therefore, clean
            // up.
            if (socket.connected) {
                console.log(socket.user.name + " is connected, removing");
                socket.on('disconnect', lastCB);
                socket.emit("kick");
                socket.emit("disconnect");
            } else {
                console.log(socket.user.name + " is not connected, removing");
                lastCB();
            }
        });
    }

    /**
     * Detach a connected socket and then remove it from the list of known sockets,
     * so a reconnect is never attempted again
     */
    function removeSocket(socket) {
        var index = sockets.indexOf(socket);

        detachSocket(socket);

        if (index !== -1) {
            sockets.splice(index, 1);
        }
    }

    this.getDocument = function () {
        return document;
    };

    this.isAvailable = function () {
        return isAvailable;
    };

    this.destroy = function (callback) {
        async.each(sockets, function (socket, cb) {
            detachSocket(socket, cb);
        }, function () {
            //objectCache.forgetTrackedObject(chunk);
            delete app.get('roomCache')[document._id];
            document.live = false;
            sockets.length = 0;
            recorder.destroy(callback);
        });
    };

    function init() {
      // Setup caching
      DocumentChunk.findById(_.last(document.chunks), function (err, lastChunk) {
        chunkManager = new ChunkManager(lastChunk);
        // Sanitize leftovers from previous session, if any
        sanitizeDocument();
        recorder = new Recorder(chunkManager.getLastChunk(), function () {
          isAvailable = true;
          app.get('roomCache')[document._id] = self;
          cb();
        });
      });
    }

    init();
};

module.exports = Room;
