# whats-miner

Client library for WhatsMiner JSON over TCP API.

## Usage

The client instance exposes a promise based interface for communicating with the WhatsMiner JSON over TCP API. All the methods also accept an optional abort signal used to abort pending requests.

```js
const { WhatsMiner, ResponseError } = require('whats-miner')

const client = WhatsMiner('localhost', 4028)

try {
  const abortController = new AbortController()
  const summary = await client.summary(abortController.signal)

  console.log(summary)
} catch (err) {
  if (err instanceof ResponseError) {
    // Handle response error
    return
  }

  throw err
}
```
