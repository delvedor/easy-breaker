'use strict'

const t = require('tap')
const test = t.test
const EasyBreaker = require('./index')

test('Should call the function', t => {
  t.plan(2)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  easyBreaker(false, err => {
    t.error(err)
    t.is(easyBreaker._failures, 0)
  })
})

test('Default options', t => {
  t.plan(12)

  const easyBreaker = EasyBreaker(asyncOp)

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 2)
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 3)
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 4)
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 5)
  })

  setTimeout(() => {
    easyBreaker(true, err => {
      t.is(err.message, 'Circuit open')
      t.is(easyBreaker._failures, 5)
    })
  }, 50)
})

test('Should call the function (error) / 1', t => {
  t.plan(2)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)
  })
})

test('Should call the function (error) / 2', t => {
  t.plan(4)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
    })
  })
})

test('Should call the function (error threshold)', t => {
  t.plan(6)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)

      easyBreaker(true, err => {
        t.is(err.message, 'Circuit open')
        t.is(easyBreaker._failures, 2)
      })
    })
  })
})

test('Should call the function (error timeout)', t => {
  t.plan(2)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 1000
  })

  easyBreaker(true, 1000, err => {
    t.is(err.message, 'Timeout')
    t.is(easyBreaker._failures, 1)
  })
})

test('Should call the function (multiple error timeout - threshold)', t => {
  t.plan(6)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 1000
  })

  easyBreaker(true, 1000, err => {
    t.is(err.message, 'Timeout')
    t.is(easyBreaker._failures, 1)

    easyBreaker(true, 1000, err => {
      t.is(err.message, 'Timeout')
      t.is(easyBreaker._failures, 2)

      easyBreaker(true, 1000, err => {
        t.is(err.message, 'Circuit open')
        t.is(easyBreaker._failures, 2)
      })
    })
  })
})

test('Half open state', t => {
  t.plan(6)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 200
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker(true, err => {
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

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 200
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
      setTimeout(again, 300)
    })
  })

  function again () {
    t.is(easyBreaker.state, 'half-open')
    easyBreaker(false, err => {
      t.error(err)
      t.is(easyBreaker._failures, 0)
      t.is(easyBreaker.state, 'close')
    })
  }
})

test('Half open state, set to open on bad response', t => {
  t.plan(9)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 200
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
      setTimeout(again, 300)
    })
  })

  function again () {
    t.is(easyBreaker.state, 'half-open')
    easyBreaker(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
    })
  }
})

test('If the circuit is half open should run just one functions', t => {
  t.plan(16)

  const easyBreaker = EasyBreaker(asyncOp, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 200
  })

  easyBreaker(true, err => {
    t.is(err.message, 'kaboom')
    t.is(easyBreaker._failures, 1)

    easyBreaker(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
      setTimeout(again, 300)
    })
  })

  function again () {
    t.is(easyBreaker.state, 'half-open')
    easyBreaker(true, err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'open')
    })

    easyBreaker(true, err => {
      t.is(err.message, 'Circuit open')
      t.is(easyBreaker._failures, 2)
      t.is(easyBreaker.state, 'half-open')
    })

    setTimeout(() => {
      t.is(easyBreaker.state, 'half-open')
      easyBreaker(true, err => {
        t.is(err.message, 'kaboom')
        t.is(easyBreaker._failures, 2)
        t.is(easyBreaker.state, 'open')
      })
    }, 300)
  }
})

test('Should support promises', t => {
  t.plan(1)

  const easyBreaker = EasyBreaker(asyncOpPromise, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000,
    promise: true
  })

  easyBreaker(false)
    .then(() => t.is(easyBreaker._failures, 0))
    .catch(err => t.fail(err))
})

test('Should support promises (errored)', t => {
  t.plan(2)

  const easyBreaker = EasyBreaker(asyncOpPromise, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000,
    promise: true
  })

  easyBreaker(true)
    .then(() => t.fail('Should fail'))
    .catch(err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 1)
    })
})

test('Should support promises (error threshold)', t => {
  t.plan(6)

  const easyBreaker = EasyBreaker(asyncOpPromise, {
    threshold: 2,
    timeout: 1000,
    resetTimeout: 1000,
    promise: true
  })

  easyBreaker(true)
    .then(() => t.fail('Should fail'))
    .catch(err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 1)

      easyBreaker(true)
        .then(() => t.fail('Should fail'))
        .catch(err => {
          t.is(err.message, 'kaboom')
          t.is(easyBreaker._failures, 2)

          easyBreaker(true)
            .then(() => t.fail('Should fail'))
            .catch(err => {
              t.is(err.message, 'Circuit open')
              t.is(easyBreaker._failures, 2)
            })
        })
    })
})

test('Should support promises (error timeout)', t => {
  t.plan(2)

  const easyBreaker = EasyBreaker(asyncOpPromise, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 1000,
    promise: true
  })

  easyBreaker(true, 1000)
    .then(() => t.fail('Should fail'))
    .catch(err => {
      t.is(err.message, 'Timeout')
      t.is(easyBreaker._failures, 1)
    })
})

test('Should support promises (multiple error timeout - threshold)', t => {
  t.plan(6)

  const easyBreaker = EasyBreaker(asyncOpPromise, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 1000,
    promise: true
  })

  easyBreaker(true, 1000)
    .then(() => t.fail('Should fail'))
    .catch(err => {
      t.is(err.message, 'Timeout')
      t.is(easyBreaker._failures, 1)

      easyBreaker(true, 1000)
        .then(() => t.fail('Should fail'))
        .catch(err => {
          t.is(err.message, 'Timeout')
          t.is(easyBreaker._failures, 2)

          easyBreaker(true, 1000)
            .then(() => t.fail('Should fail'))
            .catch(err => {
              t.is(err.message, 'Circuit open')
              t.is(easyBreaker._failures, 2)
            })
        })
    })
})

test('If the circuit is half open should run just one functions (with promises)', t => {
  t.plan(16)

  const easyBreaker = EasyBreaker(asyncOpPromise, {
    threshold: 2,
    timeout: 200,
    resetTimeout: 200,
    promise: true
  })

  easyBreaker(true)
    .then(() => t.fail('Should fail'))
    .catch(err => {
      t.is(err.message, 'kaboom')
      t.is(easyBreaker._failures, 1)

      easyBreaker(true)
        .then(() => t.fail('Should fail'))
        .catch(err => {
          t.is(err.message, 'kaboom')
          t.is(easyBreaker._failures, 2)
          t.is(easyBreaker.state, 'open')
          setTimeout(again, 300)
        })
    })

  function again () {
    t.is(easyBreaker.state, 'half-open')
    easyBreaker(true)
      .then(() => t.fail('Should fail'))
      .catch(err => {
        t.is(err.message, 'kaboom')
        t.is(easyBreaker._failures, 2)
        t.is(easyBreaker.state, 'open')
      })

    easyBreaker(true)
      .then(() => t.fail('Should fail'))
      .catch(err => {
        t.is(err.message, 'Circuit open')
        t.is(easyBreaker._failures, 2)
        t.is(easyBreaker.state, 'half-open')
      })

    setTimeout(() => {
      t.is(easyBreaker.state, 'half-open')
      easyBreaker(true)
        .then(() => t.fail('Should fail'))
        .catch(err => {
          t.is(err.message, 'kaboom')
          t.is(easyBreaker._failures, 2)
          t.is(easyBreaker.state, 'open')
        })
    }, 300)
  }
})

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
