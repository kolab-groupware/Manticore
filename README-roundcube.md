# Integrating into Kolab

## Configuration

Set the environment variables thusly:

1. Set `AUTH` to `"ldap"`
2. Set `STORAGE` to `"chwala"`
3. Set `CHWALA_SERVER` to Chwala's file API endpoint for `GET`ing and `PUT`ing documents.
4. Change `LDAP_` entries to match the Kolab Configuration

## Server API

### Auth

`POST /auth/local` with the payload

```json
{
  "email":"some@user.com",
  "password":"their_password"
}
```

will give you this response:

```json
{
  "token": "<auth_token>"
}
```

Make all further requests with the header

`Authorization: Bearer <auth_token>`.

### Documents

1. `GET /api/documents/` returns an array of documents that have been loaded in Manticore and have been created/edited by the requesting user.
2. `GET /api/documents/:id` returns a document with the given ID.
3. `POST /api/documents/` is a request containing three fields: `id`, `title` which can be the filename, and `access` which is an _array_ of access control entries as shown in the example document. Manticore will fetch the actual file from Chwala using the provided `id`. Normally you should initialize the access array with an entry containing the creator of the session even if no one else is collaborating.
4. `PUT /api/documents/:id` lets you overwrite a document with a new one, while keeping the ID. This request can have an empty body, Manticore will take care of fetching the file like above.
5. `GET /api/documents/:id/access` returns the access control array for a document.
5. `PUT /api/documents/:id/access` lets you update the access policy.
5. `DELETE /api/documents/:uuid` deletes the document from Manticore and ends it's corresponding session.

A document is of the form:
```json
{
  "_id": "<chwala file uuid>",
  "title": "Project Report",
  "created": "2015-10-16T14:30:43.651Z",
  "date": "<last edit time>",
  "creator": {
    "name": "Administrator",
    "email": "admin@admin.com",
  },
  "editors": [{
    "name": "Administrator",
    "email": "admin@admin.com",
  }],
  "access": [{
    "identity": "admin@admin.com",
    "permission": "write"
  }, {
    "identity": "test@user.com",
    "permission": "read"
  }, {
    "identity": "another@user.com",
    "permission": "deny"
  }],
  "live": true
}
```
An access array is of the form:
```json
"access": [{
  "identity": "admin@admin.com",
  "permission": "write"
}, {
  "identity": "test@user.com",
  "permission": "read"
}, {
  "identity": "another@user.com",
  "permission": "deny"
}],
```

##Client API

### Open

When a logged-in roundcube uesr tries to open a file, Chwala should immediately equip the Manticore auth token for that user, and open up an `iframe` pointed to this location:

`http://manticore_server:port/document/:document_id/:auth_token`

which will contain a ready-to-use collaborative session.

### Control

When embedded in Roundcube, Manticore does not draw it's own toolbar, but provides a cross-iframe API instead that lets you do the same things that the Manticore toolbar can.

For controlling Manticore from Roundcube's js, the `postMessage` API's usage can be demonstrated with this example:

```js
var domain = "http://manticore_server:port",
    manticore = iframeElement.contentWindow;

manticore.postMessage({
  id: 1234,
  name: "actionExport", format: "pdf"
}, domain);

window.addEventListener("message", function (event) {
  console.log(event.data);
  /* Looks like
   * { id: 1234, successful: true }
   */
});
```
Since `postMessage` was not designed for remote function calls, the `id` property is useful for knowing which outgoing message (here, `"actionExport"`) the incoming message is a response to. Roundcube can trivially add a callback abstraction on top of this.

#### Methods

The following methods are available, prefixed with `get`, `set`, and `action`:

| Method | Response |
|--------|----------|
|`{name: "getTitle"}`|`{value: "Current Title"}`|
|`{name: "setTitle", value: "New Title"}`|`{successful: true}`|
|`{name: "getExportFormats"}`|`{value: [{ format: "odt", label: "OpenDocument Text (.odt)" }]}`|
|`{name: "actionExport", value: "pdf"}`|`{successful: true}`|
|`{name: "actionSave"}`|`{successful: true}`|
|`{name: "getMembers"}`|`{value: [ {memberId: "user_234", fullName: "John Doe", color: "#ffee00", email: "john@doe.org"} ]}`|

#### Events

The following events are available, suffixed with `Event`. They come with no `id` field.

1. `{name: "ready"}` fires when all iframe API methods are ready for use.
2. `{name: "titleChanged", value: "New Title"}`
3. `{name: "memberAdded", memberId: "user_234", fullName: "John Doe", color: "#ffee00", email: "john@doe.org"}`
4. `{name: "memberRemoved", memberId: "user_234"}`
5. `{name: "documentChanged" }` is useful for managing the state of a "save" button.
6. `{name: "sessionClosed" }` is fired when the user is kicked due to the session being destroyed.
