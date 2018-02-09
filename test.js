'use strict'

const t = require('tap')
const test = t.test
const EasyBreaker = require('./index')

test('Should call the function', t => {
  t.plan(2)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  easyBreaker.run(false, err => {
    t.error(err)
    t.is(easyBreaker._failures, 0)
  })
})

test('Should call the function (error) / 1', t => {
  t.plan(2)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  easyBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)
  })
})

test('Should call the function (error) / 2', t => {
  t.plan(4)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  easyBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker.run(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
    })
  })
})

test('Should call the function (error threshold)', t => {
  t.plan(6)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  easyBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker.run(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)

      easyBreaker.run(true, err => {
        t.is(err.message, 'Circuit open')
        t.is(easyBreaker._failures, 2)
      })
    })
  })
})

test('Should call the function (error timeout)', t => {
  t.plan(2)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 1000
  })

  easyBreaker.run(true, 1000, err => {
    t.is(err.message, 'Timeout')
    t.is(easyBreaker._failures, 1)
  })
})

test('Should call the function (multiple error timeout - threshold)', t => {
  t.plan(6)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 1000
  })

  easyBreaker.run(true, 1000, err => {
    t.is(err.message, 'Timeout')
    t.is(easyBreaker._failures, 1)

    easyBreaker.run(true, 1000, err => {
      t.is(err.message, 'Timeout')
      t.is(easyBreaker._failures, 2)

      easyBreaker.run(true, 1000, err => {
        t.is(err.message, 'Circuit open')
        t.is(easyBreaker._failures, 2)
      })
    })
  })
})

test('Half open state', t => {
  t.plan(6)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 200
  })

  easyBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker.run(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
      setTimeout(again, 300)
    })
  })

  function again () {
    t.is(easyBreaker.state, 'half-open')
  }
})

test('Half open state, set to close on good response', t => {
  t.plan(9)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 200
  })

  easyBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker.run(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
      setTimeout(again, 300)
    })
  })

  function again () {
    t.is(easyBreaker.state, 'half-open')
    easyBreaker.run(false, err => {
      t.error(err)
      t.is(easyBreaker._failures, 0)
      t.is(easyBreaker.state, 'close')
    })
  }
})

test('Half open state, set to open on bad response', t => {
  t.plan(9)

  const easyBreaker = EasyBreaker(httpCall, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 200
  })

  easyBreaker.run(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker.run(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
      setTimeout(again, 300)
    })
  })

  function again () {
    t.is(easyBreaker.state, 'half-open')
    easyBreaker.run(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
    })
  }
})

function httpCall (shouldError, delay, callback) {
  if (callback == null) {
    callback = delay
    delay = 0
  }

  setTimeout(() => {
    callback(shouldError ? new Error('kaboom') : null)
  }, delay)
}
