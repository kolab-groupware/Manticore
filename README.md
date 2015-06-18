_This is totally not ready yet. Not even pre-alpha. Only boilerplate scaffolding. Don't look!_

# Manticore

Realtime collaboration for rich office documents.

## Setup

1. Install [MongoDB](https://www.mongodb.org/) via your package manager.
2. `npm install -g bower grunt-cli`
3. Get server dependencies: `npm install`
4. Get client dependencies: `bower install`

## Run

Executing `grunt serve` runs the node server which listens at `localhost:9000`.

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
