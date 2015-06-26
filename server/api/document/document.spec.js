'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');
var User = require('../user/user.model');

describe('/api/documents tests', function () {
    var user = new User({
      provider: 'local',
      name: 'Fake User',
      email: 'test@test.com',
      password: 'password'
    }),
    authorization,
    agent;

    function loginUser() {
        return function(done) {
            agent
                .post('/auth/local')
                .send({ email: 'test@test.com', password: 'password' })
                .expect(200)
                .end(onResponse);

            function onResponse(err, res) {
               if (err) return done(err);
               authorization = 'Bearer ' + res.body.token;
               return done();
            }
        };
    }

    beforeEach(function (done) {
        user.save(function () {
            agent = request.agent(app);
            loginUser()(done);
        });
    });

    afterEach(function (done) {
        User.remove().exec().then(function () {
            done();
        });
    });

    describe('GET /api/documents', function() {
      it('should respond with JSON array', function(done) {
        agent
          .get('/api/documents')
          .set('Authorization', authorization)
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.should.be.instanceof(Array);
            done();
          });
      });
    });
})
