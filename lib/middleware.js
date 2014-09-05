var Log = require('./log')

module.exports = function (app, collection) {
  if (collection)
    MongoDB_Logger.collection = collection

  // log errors passed to the `app`
  // these are generally not "exposed" errors
  app.on('error', function (err, context) {
    if (context.log)
      context.log.emit('error', err)
  })

  return MongoDB_Logger

  function* MongoDB_Logger(next) {
    var log = this.log = new Log(this, MongoDB_Logger.collection)
    var req = this.req
    var res = this.res
    var socket = res.socket

    log.request()

    req.once('end', log.bind('end'))

    // we can just time the upstream but:
    //  - this is more accurate
    //  - we don't have try/catch downstream errors this way
    var writeHead = res.writeHead
    res.writeHead = function () {
      writeHead.apply(res, arguments)
      log.emit('header')
      log.response()
    }

    res.once('finish', log.bind('finish'))

    socket.on('close', log.bind('close'))

    var onerror = log.bind('error')
    // listening to all three is probably unnecessary but whatever
    req.on('error', onerror)
    res.on('error', onerror)
    socket.on('error', onerror)

    yield* next
  }
}