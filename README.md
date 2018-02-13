<img align="right" width="350" height="auto" src="https://martinfowler.com/bliki/images/circuitBreaker/state.png">

# easy-breaker

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/delvedor/easy-breaker.svg?branch=master)](https://travis-ci.org/delvedor/easy-breaker)  [![Coverage Status](https://coveralls.io/repos/github/delvedor/easy-breaker/badge.svg?branch=master)](https://coveralls.io/github/delvedor/easy-breaker?branch=master)

A simple [circuit breaker](https://martinfowler.com/bliki/CircuitBreaker.html) utility.

<a name="install"></a>
## Install
```
npm i easy-breaker
```

<a name="usage"></a>
## Usage
Require the library and initialize it with the function you want to put under the Circuit Breaker.
```js
const EasyBreaker = require('easy-breaker')
const simpleGet = require('simple-get')

const get = EasyBreaker(simpleGet)

get.run('http://example.com', function (err, res) {
  if (err) throw err
  console.log(res.statusCode)
})
```

If the function times out, the error will be a `TimeoutError`.<br>
If the threshold has been reached and the circuit is open the error will be a `CircuitOpenError`.

You can access the errors constructors with `require('easy-breaker').errors`.<br>
You can access the state constants with `require('easy-breaker').states`.

### Options
You can pass some custom option to change the default behavior of `EasyBreaker`:
```js
const EasyBreaker = require('easy-breaker')
const simpleGet = require('simple-get')

// the following options object contains the default values
const get = EasyBreaker(simpleGet, {
  threshold: 5
  timeout: 1000 * 10
  resetTimeout: 1000 * 10
  context: null,
  maxEventListeners: 100
})
```

- `threshold`: is the maximum numbers of failures you accept to have before opening the circuit.
- `timeout:` is the maximum number of milliseconds you can wait before return a `TimeoutError` *(read the caveats section about how the timeout is handled)*.
- `resetTimeout`: time before the circuit will move from `open` to `half-open`
- `context`: a custom context for the function to call
- `maxEventListeners`: since this library relies on events, it can happen that you reach the maximum number of events listeners before the *memory leak* warn. To avoid that log, just set an higher number with this property.

<a name="promises"></a>
### Promises
Promises and *async-await* are supported as well!<br/>
Instead of calling `run` just call `runp` and you are done!<br/>
*Note the if you use the promise version of the api also the function you are wrapping should return a promise*

```js
const EasyBreaker = require('easy-breaker')
const got = require('got')

const get = EasyBreaker(got)

get.runp('http://example.com')
  .then(console.log)
  .catch(console.log)
```

<a name="events"></a>
## Events
This circuit breaker is an event emitter, if needed you can listen to its events:
- `open`
- `half-open`
- `close`
- `result`
- `tick`

<a name="caveats"></a>
## Caveats
Run a timer for every function is pretty expensive, especially if you are running the code in a heavy load environment.<br/>
To fix this problem, `EasyBreaker` uses an atomic clock, in other words uses an interval that emits a `tick` event every `timeout / 2` milliseconds.<br>
Every running functions listens for that event and if the number of ticks received is higher than `3` it will return a `TimeoutError`.

## Acknowledgements
Image curtesy of [Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html).

<a name="license"></a>
## License
**[MIT](https://github.com/delvedor/easy-breaker/blob/master/LICENSE)**<br>

Copyright © 2018 Tomas Della Vedova
