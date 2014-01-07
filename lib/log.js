module.exports = Log

function Log(context, collection) {
  this.context = context
  this.onerror = context.onerror
  this.collection = collection

  // keep track of errors so there are no duplicates
  this.errors = []

  this.queue = []
}

Log.prototype.requestProperties = [
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

Log.prototype.responseProperties = [
  'header',
  'status',
]

Log.prototype.update = function (changes, callback) {
  callback = callback || this.onerror
  var self = this

  if (this._id)
    this.collection.update({
      _id: this._id
    }, changes, callback)
  else
    this.queue.push(function () {
      self.collection.update({
        _id: self._id
      }, changes, callback)
    })
}

Log.prototype.set = function (key, value, callback) {
  var changes = {}
  changes[key] = value
  this.update({
    $set: changes
  }, callback)
}

Log.prototype.push = function (key, value, callback) {
  var changes = {}
  changes[key] = value
  this.update({
    $push: changes
  }, callback)
}

Log.prototype.emit = function (event, err) {
  if (event === 'error' && err instanceof Error) {
    // no duplicates
    if (~this.errors.indexOf(err))
      return
    this.errors.push(err)

    // format errors for mongodb
    // why is this so retarded
    // err.message = err.message
    Object.defineProperty(err, 'message', {
      enumerable: true
    })
    Object.defineProperty(err, 'stack', {
      enumerable: true
    })

    if (!('date' in err))
      err.date = new Date()

    this.push('errors', err)
  } else {
    this.set('event.' + event, new Date())
  }
}

Log.prototype.bind = function (event) {
  return this.emit.bind(this, event)
}

Log.prototype.request = function (callback) {
  callback = callback || this.onerror
  var self = this

  var log = {
    errors: [],
    event: {
      start: new Date()
    }
  }

  var request = this.context.request
  var req = log.request = {}
  this.requestProperties.forEach(function (key) {
    req[key] = request[key]
  })

  this.collection.insert(log, {
    // need to make sure the log is written
    // before we push updates.
    // every other command can be used with w: 0
    w: 1
  }, function (err) {
    if (err)
      return callback(err)

    self._id = log._id
    while (self.queue.length)
      self.queue.shift()()
    callback(err)
  })
}

Log.prototype.response = function (callback) {
  var response = this.context.response
  var res = {}
  this.responseProperties.forEach(function (key) {
    res[key] = response[key]
  })

  this.set('response', res, callback)
}