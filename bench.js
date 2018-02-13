'use strict'

const bench = require('fastbench')
const EasyBreaker = require('./index')

const callbackBreaker = EasyBreaker(asyncOp, {
  threshold: 2,
  maxEventListeners: 1000
})

const promiseBreaker = EasyBreaker(asyncOpPromise, {
  threshold: 2,
  maxEventListeners: 1000,
  promise: true
})

const run = bench([
  function benchCallback (done) {
    callbackBreaker(false, 50, done)
  },
  function benchCallbackErrored (done) {
    callbackBreaker(true, 50, done)
  },
  function benchCallbackOpen (done) {
    callbackBreaker(true, 50, done)
  },

  function benchPromise (done) {
    promiseBreaker(false, 50)
      .then(done).catch(done)
  },
  function benchPromiseErrored (done) {
    promiseBreaker(true, 50)
      .then(done).catch(done)
  },
  function benchPromiseOpen (done) {
    promiseBreaker(true, 50)
      .then(done).catch(done)
  }
], 500)

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
