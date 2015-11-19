var passport = require('passport');
var LdapStrategy = require('passport-ldapauth');
var crypto = require('crypto');

exports.setup = function (User, config) {
    function encrypt(password) {
        var cipher = crypto.createCipher('aes-256-cbc', config.storage.webdav.key);
        return cipher.update(password, 'utf8', 'base64') + cipher.final('base64')
    }

    passport.use(new LdapStrategy({
        server: {
            url: config.auth.ldap.server,
            searchBase: config.auth.ldap.base,
            searchFilter: config.auth.ldap.filter,
            bindDn: config.auth.ldap.bindDn,
            bindCredentials: config.auth.ldap.bindPw,
            searchAttributes: ['cn']
        },
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true,
        badRequestMessage: true,
        invalidCredentials: true,
        userNotFound: true,
        constraintViolation: true
    },
    function(req, ldapUser, done) {
        var email = req.body.email,
            password = req.body.password,
            fullName = ldapUser.cn;

        User.findOne({
            email: email
        }, function (err, user) {
            if (err) { return done(err); }

            if (!user) {
                var newUser = new User({
                    name: fullName,
                    email: email,
                    provider: 'ldap',
                    role: 'user',
                    webdav: (config.storage.type === 'webdav') ? {
                        username: email,
                        password: encrypt(password)
                    } : undefined,
                    ldap: (config.storage.type === 'chwala') ? {
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
    }
  ));
};
