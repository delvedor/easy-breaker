'use strict'

const bench = require('fastbench')
const EasyBreaker = require('./index')

const callbackBreaker = EasyBreaker(asyncOp, { threshold: 2 })
const promiseBreaker = EasyBreaker(asyncOpPromise, { threshold: 2 })

const run = bench([
  function benchCallback (done) {
    callbackBreaker.run(false, 50, done)
  },
  function benchCallbackErrored (done) {
    callbackBreaker.run(true, 50, done)
  },
  function benchCallbackOpen (done) {
    callbackBreaker.run(true, 50, done)
  },

  function benchPromise (done) {
    promiseBreaker.runp(false, 50)
      .then(done).catch(done)
  },
  function benchPromiseErrored (done) {
    promiseBreaker.runp(true, 50)
      .then(done).catch(done)
  },
  function benchPromiseOpen (done) {
    promiseBreaker.runp(true, 50)
      .then(done).catch(done)
  }
], 100)

run(run)

function asyncOp (shouldError, delay, callback) {
  if (callback == null) {
    callback = delay
    delay = 0
  }

  setTimeout(() => {
    callback(shouldError ? new Error('kaboom') : null)
  }, delay)
}

function asyncOpPromise (shouldError, delay) {
  delay = delay || 0
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      shouldError ? reject(new Error('kaboom')) : resolve(null)
    }, delay)
  })
}
