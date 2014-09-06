# Koa MongoDB Logger [![Build Status](https://travis-ci.org/koajs/mongodb-logger.png)](https://travis-ci.org/koajs/mongodb-logger)

Log and profile your Koa requests to MongoDB.

```js
var koa = require('koa')
var logger = require('logger')({
  collection: // some mongodb collection
})

var app = koa()
app.use(logger)

app.use(function* (next) {
  yield User.get(this)
  this.log.emit('user') // profile
  this.log.set('user', { // logging
    _id: user._id,
    name: user.name
  })
  yield next
})
```

## API

### var logger = Logger(app, [collection])

Creates a logging middleware.

You can also set the collection asynchronously by doing:

```js
logger.collection = collection
```

Just make sure you don't start serving until the collection is set.

For performance, you may want to set `w: 0` on your collection since data loss doesn't matter much here.

### this.log

The log is stored as `this.log`. This is not the document itself as stored in MongoDB, but an interface to push data. If you want the actual document, you'll have to query MongoDB yourself.

The structure of the log document is:

```json
{
  request: this.request,
  response: this.response,
  errors: [],
  event: {
    <event>: <date>
  }
}
```

### this.log.requestProperties, this.log.responseProperties

Arrays of properties to save from `this.request` and `this.response`, respectively. You can set these yourself. By default, they are:

```js
Logger.prototype.requestProperties = [
  'header',
  'method',
  'url',
  'path',
  'querystring',
  'query',
  'host',
  'protocol',
  'secure',
  'ip',
  'ips',
]

Logger.prototype.responseProperties = [
  'header',
  'status',
]
```

### this.log.update(changes, [callback])

A wrapper around `collection.update`. Changes is the [document](http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#update) object.

### this.log.set(key, value, [callback])

A wrapper around `this.log.update()` and `$set`. Sets a key/value. For example:

```js
this.set('user._id', user._id)
```

Would make the log look something like:

```json
{
  request: this.request,
  response: this.response,
  errors: [],
  event: {
    <event>: <date>
  },
  user: {
    _id: ObjectId('123412341234123412341234')
  }
}
```

### this.log.push(key, value, [callback])

A wrapper around `this.log.update()` and `$push`. Very similar to `this.log.set()`.

### this.log.emit(event, [error])

Log isn't an `EventEmitter` - emit is special. It takes no additional arguments except `error` if and only if `event === 'error'`.

This is for profiling events in your request. Events are saved as `<event>: <date>`. For example:

```js
this.log.emit('user')
```

Will create a log that looks like:

```json
{
  event: {
    start: <some date>,
    user: <some date + 10ms>
  }
}
```

Thus, do not use duplicate events!

The following events are emitted and saved automatically:

- `start`
- `end` - `req.on('end')`
- `header` - `res.writeHead()`
- `finish` - `res.on('finish')`
- `close` - `res.on('close')`
- `error` - listens to `res`, `req`, `socket`, and `app`

### this.log.bind(event)

Creates a listener for a `.on()` event. Example:

```js
var stream = fs.createReadStream()

stream.on('finish', this.log.bind('when this stream finishes'))
```

will add a log:

```json
{
  event: {
    'when this stream finishes': <date>
  }
}
```

## License

The MIT License (MIT)

Copyright (c) 2014 Jonathan Ong me@jongleberry.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
