'use strict'

const fp = require('fastify-plugin')

function fastifySqlite (fastify, opts, next) {
  // todo
  next()
}

module.exports = fp(fastifySqlite, {
  name: 'fastify-sqlite',
  fastify: '^4.x'
})
