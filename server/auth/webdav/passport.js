var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var dav = require('dav');

exports.setup = function (User, config) {
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
                baseUrl: config.storage.server
            }
        );
        client.send(
            dav.request.basic({ method: 'OPTIONS', data: ''}),
            config.storage.path
        ).then(
            function success() {
                User.findOne({
                    email: email.toLowerCase()
                }, function (err, user) {
                    if (err) { return done(err); }

                    if (!user) {
                        var newUser = new User({
                            name: email,
                            email: email,
                            provider: 'webdav',
                            role: 'user',
                            webdav: {
                                username: email,
                                password: password
                            }
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
