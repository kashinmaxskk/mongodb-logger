var MongoClient = require('mongodb').MongoClient
var request = require('supertest')
var koa = require('koa')

var mongodb_uri = process.env.MONGODB_URI
  || 'mongodb://localhost:27017/mongodb_logger?w=0'

var logger = require('./')
var collection

describe('Koa MongoDB Logger', function () {
  it('should connect', function (done) {
    MongoClient.connect(mongodb_uri, function (err, db) {
      if (err)
        return done(err)

      collection = db.collection('logs')
      done()
    })
  })

  describe('.socket', function () {
    it('should save a socket id', function (done) {
      var app = koa()
      app.use(logger(app, collection))
      app.use(function* (next) {
        this.status = 204
      })

      request(app.listen())
      .get('/')
      .expect(204, function (err, res) {
        if (err)
          return done(err)

        latest(function (err, log) {
          if (err)
            return done(err)

          log.socket.should.be.a.String
          done()
        })
      })
    })
  })

  describe('.request', function () {
    it('should save the request', function (done) {
      var app = koa()
      app.use(logger(app, collection))
      app.use(function* (next) {
        this.status = 204
      })

      request(app.listen())
      .get('/')
      .expect(204, function (err, res) {
        if (err)
          return done(err)

        latest(function (err, log) {
          if (err)
            return done(err)

          log.request.url.should.equal('/')
          log.request.path.should.equal('/')
          log.request.query.should.eql({})
          done()
        })
      })
    })
  })

  describe('.response', function () {
    it('should save the response', function (done) {
      var app = koa()
      app.use(logger(app, collection))
      app.use(function* (next) {
        this.body = new Buffer(10)
      })

      request(app.listen())
      .get('/')
      .expect(200, function (err, res) {
        if (err)
          return done(err)

        latest(function (err, log) {
          if (err)
            return done(err)

          log.response.status.should.equal(200)
          log.response.header['content-length'].should.equal('10')
          done()
        })
      })
    })
  })

  describe('.errors', function () {
    it('should catch app errors', function (done) {
      var app = koa()
      app.use(logger(app, collection))
      app.use(function* (next) {
        throw new Error('boom')
      })

      request(app.listen())
      .get('/')
      .expect(500, function (err, res) {
        if (err)
          return done(err)

        latest(function (err, log) {
          if (err)
            return done(err)

          log.errors.length.should.equal(1)
          log.errors[0].message.should.equal('boom')
          log.errors[0].stack.should.be.a.String
          done()
        })
      })
    })

    it('should catch socket errors', function (done) {
      var app = koa()
      app.use(logger(app, collection))
      app.use(function* (next) {
        this.socket.emit('error', new Error('boom'))
      })

      request(app.listen())
      .get('/')
      .expect(500, function (err, res) {
        // if (err)
          // return done(err)

        latest(function (err, log) {
          if (err)
            return done(err)

          log.errors.length.should.equal(1)
          log.errors[0].message.should.equal('boom')
          log.errors[0].stack.should.be.a.String
          done()
        })
      })
    })

    it('should not catch duplicate errors', function () {})
  })

  describe('.event', function () {
    it('should save basic node events', function (done) {
      var app = koa()
      app.use(logger(app, collection))
      app.use(function* (next) {
        this.req.resume()
        this.status = 204
      })

      request(app.listen())
      .get('/')
      .set('Connection', 'Close')
      .expect(204, function (err, res) {
        if (err)
          return done(err)

        latest(function (err, log) {
          if (err)
            return done(err)

          log.event.start.should.be.a.Date
          log.event.end.should.be.a.Date
          log.event.finish.should.be.a.Date
          // log.event.close.should.be.a.Date
          log.event.header.should.be.a.Date
          done()
        })
      })
    })
  })

  describe('.emit', function () {
    it('should emit a custom event', function (done) {
      var app = koa()
      app.use(logger(app, collection))
      app.use(function* (next) {
        this.log.emit('user')
        this.status = 204
      })

      request(app.listen())
      .get('/')
      .expect(204, function (err, res) {
        if (err)
          return done(err)

        latest(function (err, log) {
          if (err)
            return done(err)

          log.event.user.should.be.a.Date
          done()
        })
      })
    })
  })

  describe('.set', function () {

  })

  describe('.push', function () {

  })

  describe('.update', function () {

  })
})

function latest(callback) {
  setTimeout(function () {
    collection.findOne({}, {
      sort: {
        _id: -1
      }
    }, callback)
  }, 25)
}