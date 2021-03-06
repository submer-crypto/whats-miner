const net = require('net')
const { finished } = require('stream/promises')

const MessageCode = {
  14: 'invalid api command or data',
  23: 'invalid json message',
  45: 'permission denied',
  131: 'command OK',
  132: 'command error',
  134: 'get token message OK',
  135: 'check token error',
  136: 'token over max times',
  137: 'base64 decode error'
}

class ResponseError extends Error {
  constructor (response, message) {
    super('unexpected response received: ' + message)
    this.response = response
  }
}

class WhatsMiner {
  constructor (host, port) {
    this._host = host
    this._port = port
  }

  async summary (signal) {
    const response = await this.command('summary', signal)
    return response.SUMMARY
  }

  async pools (signal) {
    const response = await this.command('pools', signal)
    return response.POOLS
  }

  async edevs (signal) {
    const response = await this.command('edevs', signal)
    return response.DEVS
  }

  async devDetails (signal) {
    const response = await this.command('devdetails', signal)
    return response.DEVDETAILS
  }

  async getVersion (signal) {
    return await this.command('get_version', signal)
  }

  async command (cmd, signal) {
    const socket = net.connect(this._port, this._host)
    const buffers = []

    socket.on('data', data => buffers.push(data))
    socket.end(JSON.stringify({ cmd }))

    try {
      await finished(socket, { signal })
    } catch (err) {
      socket.destroy()
      if (err.code === 'ABORT_ERR') throw err
      throw new ResponseError(null, err.message)
    }

    const buffer = Buffer.concat(buffers)
    const json = buffer.toString('utf-8')
    let response

    try {
      response = JSON.parse(json)
    } catch (err) {
      throw new ResponseError(json, err.message)
    }

    if (response.STATUS === 'E') {
      const code = response.Code
      const message = (MessageCode[code] + ` (${code})`) || ('unknwon error code ' + code)
      throw new ResponseError(json, message)
    }

    return response
  }
}

exports.ResponseError = ResponseError
exports.WhatsMiner = WhatsMiner
