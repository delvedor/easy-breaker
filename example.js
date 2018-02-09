'use strict'

const EasyBreaker = require('./index')

function httpCall (callback) {
  setTimeout(() => {
    callback(new Error('kaboom'))
  }, 500)
}

const circuit = EasyBreaker(httpCall, { threshold: 2, timeout: 1000, resetTimeout: 1000 })

circuit.on('open', () => console.log('open'))
circuit.on('half-open', () => console.log('half-open'))
circuit.on('close', () => console.log('close'))

circuit.run(err => {
  console.log(err)
})

circuit.run(err => {
  console.log(err)
})

setTimeout(() => {
  circuit.run(err => {
    console.log(err)
  })
}, 1000)

setTimeout(() => {
  circuit.run(err => {
    console.log(err)
  })
}, 1500)

setTimeout(() => {
  circuit.run(err => {
    console.log(err)
  })
}, 3500)
