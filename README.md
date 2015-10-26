# Manticore

Realtime collaboration for rich office documents.

## Setup

1. Install [MongoDB](https://www.mongodb.org/) via your package manager.
2. `npm install -g bower grunt-cli phantomjs`
3. Get server dependencies: `npm install`
4. Get client dependencies: `bower install`

Optionally, run a [locodoc](https://github.com/adityab/locodoc) server for the ability to export to other document formats (`pdf`, `doc`, `docx`, `txt`).

## Run

### For frontend development  
`grunt serve`  
Runs the node server which listens at `localhost:9000`. This doesn't gracefully shut down the server due to [grunt-express-server](https://github.com/ericclemmons/grunt-express-server) eating the relevant signals. So you'll need to manually kill the node process, till there is a better solution.

### For backend development
`node server/app.js`  
Does the same as the `grunt serve`, except that you don't get live-reloading when you change some code. Gracefully persists objects and disconnects clients and the DB when you `SIGTERM` or `SIGINT` it (just do <kbd>Ctrl+C</kbd>).

## Configure

All environment variables are stored in `server/config/local.env.js`. Since it
is unwise to checkin sensitive information into version control, this file is
blacklisted in `.gitignore`. To get your own usable version, copy the existing
`local.env.sample.js` under `server/config` to the aforementioned file, and then
make the necessary modifications for your deployment.

## Develop

Install [AngularJS Batarang](https://chrome.google.com/webstore/detail/angularjs-batarang/ighdmehidhipcmcojjgiloacoafjmpfk)
from the Chrome extensions store. This will let you inspect live Angular scopes,
among other things.
