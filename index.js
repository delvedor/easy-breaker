'use strict'

const EE = require('events').EventEmitter
const inherits = require('util').inherits
const once = require('once')
const debug = require('debug')('circuit-breaker')

function CircuitBreaker (fn, opts) {
  if (!(this instanceof CircuitBreaker)) {
    return new CircuitBreaker(fn, opts)
  }

  opts = opts || {}

  this.fn = fn
  this.threshold = opts.threshold || 5
  this.timeout = opts.timeout || 1000 * 10
  this.resetTimeout = opts.resetTimeout || 1000 * 10
  this.context = opts.context || null
  // 'close', 'open', 'half-open'
  this.state = 'close'
  this._failures = 0
  this._currentlyRunningFunctions = 0

  this._interval = null

  this.on('result', () => {
    --this._currentlyRunningFunctions
    if (this._currentlyRunningFunctions === 0) {
      this._stopTicker()
    }
  })

  this.on('open', () => {
    setTimeout(() => {
      debug('Try half open')
      this.halfOpen()
    }, this.resetTimeout)
  })
}

inherits(CircuitBreaker, EE)

CircuitBreaker.prototype.run = function () {
  ++this._currentlyRunningFunctions
  this._runTicker()
  debug('Run new function')
  const args = new Array(arguments.length)
  for (var i = 0, len = args.length; i < len; i++) {
    args[i] = arguments[i]
  }

  const callback = once(args.pop())
  args.push(wrapCallback.bind(this))

  if (this.state === 'open') {
    debug('Circuit is open, returning error')
    this.emit('result')
    return callback(new Error('Circuit open'))
  }

  var ticks = 0
  this.once('tick', onTick.bind(this))

  function onTick () {
    if (++ticks >= 3) {
      debug('Tick timeout')
      if (this.state === 'half-open') {
        debug('Circuit is half open, reopening')
        this.open()
      }
      this.emit('result')
      return callback(new Error('Timeout'))
    }
    this.once('tick', onTick.bind(this))
  }

  this.fn.apply(this.context, args)

  function wrapCallback () {
    debug('Got result')
    const args = new Array(arguments.length)
    for (var i = 0, len = args.length; i < len; i++) {
      args[i] = arguments[i]
    }

    if (args[0] instanceof Error) {
      debug('Result errored')
      if (this.state === 'half-open') {
        debug('Circuit is half open, reopening')
        this.open()
      } else {
        debug('Circuit is closed, emitting failure')
        this._onFailure()
      }

      this.emit('result')
      return callback(args[0])
    }

    debug('Successful execution')
    this.emit('result')
    this.close()
    callback.apply(null, args)
  }
}

CircuitBreaker.prototype._onFailure = function () {
  this._failures++
  if (this._failures >= this.threshold) {
    debug('Threshold reached, opening circuit')
    this.open()
  }
}

CircuitBreaker.prototype.open = function () {
  debug('Set state to \'open\'')
  this.state = 'open'
  this.emit('open')
}

CircuitBreaker.prototype.halfOpen = function () {
  debug('Set state to \'half-open\'')
  this.state = 'half-open'
  this.emit('half-open')
}

CircuitBreaker.prototype.close = function () {
  debug('Set state to \'close\'')
  this._failures = 0
  this.state = 'close'
  this.emit('close')
}

CircuitBreaker.prototype._runTicker = function () {
  if (this._interval === null) return
  this._interval = setInterval(() => {
    debug('Emit tick')
    this.emit('tick')
  }, this.timeout / 2)
}

CircuitBreaker.prototype._stopTicker = function () {
  if (this._interval === null) return
  clearInterval(this._interval)
  this._interval = null
}

module.exports = CircuitBreaker
