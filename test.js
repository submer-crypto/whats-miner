const net = require('net')
const { promisify } = require('util')
const { finished } = require('stream')
const test = require('tape')
const { WhatsMiner, ResponseError } = require('.')

const createServer = async function (cb) {
  return new Promise((resolve, reject) => {
    const server = net.createServer(socket => {
      const buffers = []
      socket.on('data', data => buffers.push(data))

      finished(socket, { writable: false }, err => {
        if (err) return cb(err)
        cb(null, [socket, Buffer.concat(buffers)])
      })
    })

    server.listen(0, () => {
      const address = server.address()
      resolve([server, address.port])
    })

    server.unref()
    server.on('error', err => reject(err))
  })
}

test('get summary', async t => {
  t.plan(3)

  const [server, port] = await createServer((err, [socket, data]) => {
    t.error(err)
    t.deepEqual(data, Buffer.from('{"cmd":"summary"}'))

    socket.end(JSON.stringify({
      STATUS: {},
      SUMMARY: {
        Temperature: 25,
        Voltage: 1400
      }
    }))
  })

  const client = new WhatsMiner('localhost', port)
  const summary = await client.summary()

  t.deepEqual(summary, {
    Temperature: 25,
    Voltage: 1400
  })

  await promisify(server.close.bind(server))()
})

test('get edevs', async t => {
  t.plan(3)

  const [server, port] = await createServer((err, [socket, data]) => {
    t.error(err)
    t.deepEqual(data, Buffer.from('{"cmd":"edevs"}'))

    socket.end(JSON.stringify({
      STATUS: {},
      DEVS: [{
        ASC: 0,
        Temperature: 25
      }]
    }))
  })

  const client = new WhatsMiner('localhost', port)
  const edevs = await client.edevs()

  t.deepEqual(edevs, [{
    ASC: 0,
    Temperature: 25
  }])

  await promisify(server.close.bind(server))()
})

test('json error', async t => {
  t.plan(5)

  const [server, port] = await createServer((err, [socket, data]) => {
    t.error(err)
    t.deepEqual(data, Buffer.from('{"cmd":"summary"}'))

    socket.end('{"STATUS":}')
  })

  const client = new WhatsMiner('localhost', port)

  try {
    await client.summary()
  } catch (err) {
    t.ok(err instanceof ResponseError)
    t.match(err.message, /^unexpected response received:/)
    t.equal(err.response, '{"STATUS":}')
    return
  } finally {
    await promisify(server.close.bind(server))()
  }

  t.fail('expected error')
})

test('status error', async t => {
  t.plan(5)

  const [server, port] = await createServer((err, [socket, data]) => {
    t.error(err)
    t.deepEqual(data, Buffer.from('{"cmd":"summary"}'))

    socket.end(JSON.stringify({
      STATUS: 'E',
      Code: 132
    }))
  })

  const client = new WhatsMiner('localhost', port)

  try {
    await client.summary()
  } catch (err) {
    t.ok(err instanceof ResponseError)
    t.equal(err.message, 'unexpected response received: command error (132)')
    t.equal(err.response, '{"STATUS":"E","Code":132}')
    return
  } finally {
    await promisify(server.close.bind(server))()
  }

  t.fail('expected error')
})

test('connection error', async t => {
  t.plan(3)

  const client = new WhatsMiner('localhost', 14871)

  try {
    await client.summary()
  } catch (err) {
    t.ok(err instanceof ResponseError)
    t.match(err.message, /^unexpected response received:/)
    t.equal(err.response, null)
    return
  }

  t.fail('expected error')
})
