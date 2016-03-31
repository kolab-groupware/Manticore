## Document persistence

A Document object contains the metadata for an editable collaborative session.
For example: the title, 'live' status, creation/modification dates, and most importantly an array of 'chunks'.

A DocumentChunk object contains a 'snapshot' of the session, which is represented by the `fileId` of an ODT file stored in GridFS, and an array of WebODF 'operations' that are to be executed on that snapshot.

As a session progresses, the last chunk is loaded into memory and more operations are appended to it. Once the session is closed or someone issues a 'save' action, an ODT snapshot is made - and with it, a new chunk is created. This way, when a new person joins a session, they only have to access the last chunk their browser does not need to 'replay' the entire operation history of the document.

## Storage adapters

A storage adapter is a way to get documents in and out of Manticore with special overrides of the document API's controller methods.

In the default case where Manticore is a standalone installation, the `local` storage adapter is used.  
However, two other storage adapters are implemented: `webdav` and `chwala`.

### `webdav`

This can be used with any authentication strategy. You can set the `WEBDAV_SERVER` and `WEBDAV_PATH` config variables to point to the server of your choice. There are many different implementations of WebDAV out there, and Manticore's adapter has been seen to work with Kolab's iRony, OwnCloud, and Box.net.

There may not be sufficient uniqueness guarantees for documents in a WebDAV server, so our adapter tries to build a unique `contentId` by combining the `etag` and `last-modified` values into one. When a new document (available to the logged-in user) is found on the WebDAV server, a `Document` entry for it is created in the DB and its `webdav.contentId` field is set to the aforementioned value.

The uniqueness of the `contentId` allows us to reasonably detect when a document has been moved, modified, or deleted on the server.

When a document is 'opened' for editing (with a `GET`, for example), if a chunk isn't available with Manticore, the file is downloaded by Manticore from the WebDAV server and the first chunk is made.  
When the 'save' action is done in an ongoing editing session, a new chunk+snapshot is created and the new ODT file is persisted back to the server, and the WebDAV/Manticore `etag`s are made consistent.

### `chwala`

This is only usable with the LDAP auth strategy. Manticore is meant to be used (only the editor part) via an `iframe` within the Roundcube UI.

`Document`s are created in Manticore when the storage adapter gets an authenticated (as the 'creating' user) `POST` request from chwala, containing the Chwala `id` of the file, a `title` string, and an access permissions list.  
When the first chunk has to be created, Manticore will issue an authenticated `GET` to Chwala to retrieve the actual ODT file.

For more info, see `README-roundcube.md`.

## Editing

The client-side and server-side talk to each other through 'adaptors'.

### Managing sessions (rooms)

1. `components/adaptor/index.js` contains the logic for receiving requests from users to join an editing 'room' addressed by the document Id, and determining whether to create a 'room' if none exists.
2. `components/adaptor/room.js` handles every websocket-communicated event and action that can happen in an editing session in terms of operations and status messages, relays WebODF operations between clients, adds cleanup operations in case clients drop out, and persists these operations to the latest chunk. Each document gets it's own room.
3. `components/adaptor/recorder.js` contains two separate kinds of code that are run:
    - In the Manticore nodejs process, to issue instructions to the serverside phantomjs session used for maintaining the live DOM version of a session
    - In the phantomjs-contained webpage, that takes care to service requests from the node process and generates zipped-up ODT snapshots when needed.

  The live ODT DOM is generated whenever a fresh session is created, so that clients can open collaborative documents almost instantly without replaying anything.

Every incoming operation by a client is relayed to the webodf instance maintaining the live DOM in `recorder.js`, and only when everything executes fine without errors is the parent `Room` informed of it, at which point the new operations are appended to the DB entry and passed on to other clients.

### Session messaging

In an editing session, all messaging is done with SocketIO.

1. The client establishes an authenticated connection using the session auth token, and then emits a `join` message with the corresponding `documentId`.
2. The server adds the incoming connection's socket to a Room if all checks pass, and once the member is added to the Document, a `join_success` message is sent to the client with:
  - The `memberId` assigned to the client
  - The 'genesisUrl' that the client's Wodo editor can download the ODT snapshot from
  - The `permission` that the member has (read/write).
3. The client sends a `replay` message, to the server, which upon receiving it responds all the operations that are to be played on the document snapshot, as a `replay` message to the client.
4. When the user makes edits, the client sends these new operations to the server with a `commit_ops` message.
5. When the server receives operations from a client, and they execute successfully on the serverside live document, they are relayed to all other clients within a `new_ops` message.
6. A client sends a `leave` message when exiting a session.
7. When the server wants to get rid of a client, it sends a `kick` message to the client, following which no operations from that client will be listened to, and the editor can be gracefully made read-only.
