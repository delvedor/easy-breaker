'use strict'

const t = require('tap')
const test = t.test
const CircuitBreaker = require('./index')

test('Should call the function', t => {
  t.plan(2)

  const circuitBreaker = CircuitBreaker(httpCall, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  circuitBreaker.run(false, err => {
    t.error(err)
    t.is(circuitBreaker._failures, 0)
  })
})

test('Should call the function (error) / 1', t => {
  t.plan(2)

  const circuitBreaker = CircuitBreaker(httpCall, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  circuitBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(circuitBreaker._failures, 1)
  })
})

test('Should call the function (error) / 2', t => {
  t.plan(4)

  const circuitBreaker = CircuitBreaker(httpCall, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  circuitBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(circuitBreaker._failures, 1)

    circuitBreaker.run(true, err => {
      t.is(err.message, 'kaboom')
      t.is(circuitBreaker._failures, 2)
    })
  })
})

test('Should call the function (error threshold)', t => {
  t.plan(6)

  const circuitBreaker = CircuitBreaker(httpCall, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  circuitBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(circuitBreaker._failures, 1)

    circuitBreaker.run(true, err => {
      t.is(err.message, 'kaboom')
      t.is(circuitBreaker._failures, 2)

      circuitBreaker.run(true, err => {
        t.is(err.message, 'Circuit open')
        t.is(circuitBreaker._failures, 2)
      })
    })
  })
})

test('Should call the function (error timeout)', t => {
  t.plan(2)

  const circuitBreaker = CircuitBreaker(longHttpCall, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 1000
  })

  circuitBreaker.run(true, err => {
    t.is(err.message, 'Timeout')
    t.is(circuitBreaker._failures, 1)
  })
})

function httpCall (shouldError, callback) {
  setTimeout(() => {
    callback(shouldError ? new Error('kaboom') : null)
  }, 0)
}

function longHttpCall (shouldError, callback) {
  setTimeout(() => {
    callback(shouldError ? new Error('kaboom') : null)
  }, 1000)
}
