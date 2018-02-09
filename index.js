'use strict'

const EE = require('events').EventEmitter
const inherits = require('util').inherits
const once = require('once')
const debug = require('debug')('easy-breaker')

const timeoutError = new Error('Timeout')
const openError = new Error('Circuit open')

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
  this.state = 'close' // 'close', 'open', 'half-open'

  this._failures = 0
  this._currentlyRunningFunctions = 0
  this._interval = null

  this.on('open', () => {
    debug('Set state to \'open\'')
    this.state = 'open'

    setTimeout(() => this.emit('half-open'), this.resetTimeout)
  })

  this.on('half-open', () => {
    debug('Set state to \'half-open\'')
    this.state = 'half-open'
  })

  this.on('close', () => {
    debug('Set state to \'close\'')
    this._failures = 0
    this.state = 'close'
  })

  this.on('result', err => {
    if (err) {
      if (this.state === 'half-open') {
        debug('Theere is an error and the circuit is half open, reopening')
        this.emit('open')
      } else if (this.state === 'close') {
        this._failures++
        if (this._failures >= this.threshold) {
          debug('Threshold reached, opening circuit')
          this.emit('open')
        }
      }
    } else {
      this.emit('close')
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
  this._currentlyRunningFunctions++
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
    this.emit('result', openError)
    return callback(openError)
  }

  if (this.state === 'half-open' && this._currentlyRunningFunctions > 1) {
    debug('Circuit is half-open and there is already a running function, returning error')
    this.emit('result', openError)
    return callback(openError)
  }

  var ticks = 0
  var gotResult = false
  this.once('tick', onTick.bind(this))

  function onTick () {
    if (++ticks >= 3) {
      debug('Tick timeout')
      this.emit('result', timeoutError)
      return callback(timeoutError)
    }
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

EasyBreaker.prototype._runTicker = function () {
  if (this._interval !== null) return

  debug(`Starting ticker, ticking every ${this.timeout / 2}ms`)
  this._interval = setInterval(() => {
    debug('Emit tick')
    this.emit('tick')
  }, this.timeout / 2)
}

EasyBreaker.prototype._stopTicker = function () {
  if (this._interval === null) return

  clearInterval(this._interval)
  this._interval = null
  debug('Stopped ticker')
}

module.exports = EasyBreaker
