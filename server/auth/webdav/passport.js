var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var dav = require('dav');
var crypto = require('crypto');

exports.setup = function (User, config) {
  function encrypt(password) {
      var cipher = crypto.createCipher('aes-256-cbc', config.storage.webdav.key);
      return cipher.update(password, 'utf8', 'base64') + cipher.final('base64')
  }

  passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password' // this is the virtual field on the model
    },
    function(email, password, done) {
        var client = new dav.Client(
            new dav.transport.Basic(new dav.Credentials({
                username: email,
                password: password
            })),
            {
                baseUrl: config.storage.webdav.server
            }
        );
        client.send(
            dav.request.basic({ method: 'OPTIONS', data: ''}),
            config.storage.webdav.path
        ).then(
            function success() {
                User.findOne({
                    email: email
                }, function (err, user) {
                    if (err) { return done(err); }

                    if (!user) {
                        var newUser = new User({
                            name: email,
                            email: email,
                            provider: 'webdav',
                            role: 'user',
                            webdav: (config.storage.type === 'webdav') ? {
                                username: email,
                                password: encrypt(password)
                            } : undefined
                        });
                        newUser.save(function (err, user) {
                            if (err) { return done(err); }
                            if (!err) {
                                return done(null, user);
                            }
                        });
                    } else {
                        return done(null, user);
                    }
                });
            },
            function failure(err) {
                return done(err);
            }
        );
    }
  ));
};
