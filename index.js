'use strict'

const EE = require('events').EventEmitter
const inherits = require('util').inherits
const once = require('once')
const debug = require('debug')('easy-breaker')

const OPEN = 'open'
const HALFOPEN = 'half-open'
const CLOSE = 'close'

function EasyBreaker (fn, opts) {
  if (!(this instanceof EasyBreaker)) {
    return new EasyBreaker(fn, opts)
  }

  opts = opts || {}

  this.fn = fn
  this.threshold = opts.threshold || 5
  this.timeout = opts.timeout || 1000 * 10
  this.resetTimeout = opts.resetTimeout || 1000 * 10
  this.context = opts.context || null
  this.state = CLOSE // 'close', 'open', 'half-open'

  this._failures = 0
  this._currentlyRunningFunctions = 0
  this._interval = null

  this.setMaxListeners(opts.maxEventListeners || 100)

  this.on(OPEN, () => {
    debug('Set state to \'open\'')
    if (this.state !== OPEN) {
      setTimeout(() => this.emit(HALFOPEN), this.resetTimeout)
    }
    this.state = OPEN
  })

  this.on(HALFOPEN, () => {
    debug('Set state to \'half-open\'')
    this.state = HALFOPEN
  })

  this.on(CLOSE, () => {
    debug('Set state to \'close\'')
    this._failures = 0
    this.state = CLOSE
  })

  this.on('result', err => {
    if (err) {
      if (this.state === HALFOPEN) {
        debug('There is an error and the circuit is half open, reopening')
        this.emit(OPEN)
      } else if (this.state === CLOSE) {
        this._failures++
        debug('Current number of failures:', this._failures)
        if (this._failures >= this.threshold) {
          debug('Threshold reached, opening circuit')
          this.emit(OPEN)
        }
      }
    } else {
      if (this._failures > 0) {
        this.emit(CLOSE)
      }
    }

    this._currentlyRunningFunctions--
    if (this._currentlyRunningFunctions === 0) {
      debug('There are no more running functions, stopping ticker')
      this._stopTicker()
    }
  })
}

inherits(EasyBreaker, EE)

EasyBreaker.prototype.run = function () {
  debug('Run new function')

  const args = new Array(arguments.length)
  for (var i = 0, len = args.length; i < len; i++) {
    args[i] = arguments[i]
  }

  const callback = once(args.pop())
  args.push(wrapCallback.bind(this))

  if (this.state === OPEN) {
    debug('Circuit is open, returning error')
    return callback(new CircuitOpenError())
  }

  if (this.state === HALFOPEN && this._currentlyRunningFunctions >= 1) {
    debug('Circuit is half-open and there is already a running function, returning error')
    return callback(new CircuitOpenError())
  }

  this._currentlyRunningFunctions++
  this._runTicker()
  var ticks = 0
  var gotResult = false
  this.once('tick', onTick.bind(this))

  function onTick () {
    if (++ticks >= 3) {
      debug('Tick timeout')
      const error = new TimeoutError()
      this.emit('result', error)
      return callback(error)
    }
    /* istanbul ignore if */
    if (gotResult === false) {
      this.once('tick', onTick.bind(this))
    }
  }

  this.fn.apply(this.context, args)

  function wrapCallback () {
    debug('Got result')
    gotResult = true

    const args = new Array(arguments.length)
    for (var i = 0, len = args.length; i < len; i++) {
      args[i] = arguments[i]
    }

    debug(args[0] != null ? 'Result errored' : 'Successful execution')
    this.emit('result', args[0])
    callback.apply(null, args)
  }
}

EasyBreaker.prototype.runp = function () {
  debug('Run promise new function')

  if (this.state === OPEN) {
    debug('Circuit is open, returning error')
    return Promise.reject(new CircuitOpenError())
  }

  if (this.state === HALFOPEN && this._currentlyRunningFunctions >= 1) {
    debug('Circuit is half-open and there is already a running function, returning error')
    return Promise.reject(new CircuitOpenError())
  }

  const args = new Array(arguments.length)
  for (var i = 0, len = args.length; i < len; i++) {
    args[i] = arguments[i]
  }

  this._currentlyRunningFunctions++
  this._runTicker()

  return new Promise((resolve, reject) => {
    var ticks = 0
    var gotResult = false
    this.once('tick', onTick.bind(this))

    function onTick () {
      if (++ticks >= 3) {
        debug('Tick timeout')
        const error = new TimeoutError()
        this.emit('result', error)
        return reject(error)
      }
      /* istanbul ignore if */
      if (gotResult === false) {
        this.once('tick', onTick.bind(this))
      }
    }

    this.fn.apply(this.context, args)
      .then(val => promiseCallback(this, null, val))
      .catch(err => promiseCallback(this, err, undefined))

    function promiseCallback (context, err, result) {
      debug('Got promise result')
      gotResult = true

      debug(err != null ? 'Result errored' : 'Successful execution')
      context.emit('result', err)
      err ? reject(err) : resolve(result)
    }
  })
}

EasyBreaker.prototype._runTicker = function () {
  /* istanbul ignore if */
  if (this._interval !== null) return

  debug(`Starting ticker, ticking every ${this.timeout / 2}ms`)
  this._interval = setInterval(() => {
    debug('Emit tick')
    this.emit('tick')
  }, this.timeout / 2)
}

EasyBreaker.prototype._stopTicker = function () {
  /* istanbul ignore if */
  if (this._interval === null) return

  clearInterval(this._interval)
  this._interval = null
  debug('Stopped ticker')
}

function TimeoutError (message) {
  Error.call(this)
  Error.captureStackTrace(this, TimeoutError)
  this.name = 'TimeoutError'
  this.message = 'Timeout'
}

inherits(TimeoutError, Error)

function CircuitOpenError (message) {
  Error.call(this)
  Error.captureStackTrace(this, CircuitOpenError)
  this.name = 'CircuitOpenError'
  this.message = 'Circuit open'
}

inherits(CircuitOpenError, Error)

module.exports = EasyBreaker
module.exports.errors = { TimeoutError, CircuitOpenError }
module.exports.states = { OPEN, HALFOPEN, CLOSE }
