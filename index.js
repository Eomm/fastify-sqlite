'use strict'

const fp = require('fastify-plugin')
const sqlite3 = require('sqlite3')

function fastifySqlite (fastify, opts, next) {
  const Sqlite = (opts.verbose === true)
    ? sqlite3.verbose()
    : sqlite3

  const filename = opts.dbFile || ':memory:'
  const mode = opts.mode || (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE | sqlite3.OPEN_FULLMUTEX)

  const db = new Sqlite.Database(filename, mode, (err) => {
    if (err) {
      return next(err)
    }

    decorateFastifyInstance(fastify, db, opts, next)
  })
}

function decorateFastifyInstance (fastify, db, opts, next) {
  fastify.addHook('onClose', close.bind(db))

  const name = opts.name

  if (!name) {
    if (fastify.sqlite) {
      return next(new Error('fastify-sqlite has been already registered'))
    }
    fastify.decorate('sqlite', db)
  } else {
    if (!fastify.sqlite) {
      fastify.decorate('sqlite', Object.create(null))
    }

    if (fastify.sqlite[name]) {
      return next(new Error(`Connection name [${name}] already registered`))
    }

    fastify.sqlite[name] = db
  }

  next()
}

function close (instance, done) {
  this.close(done)
}

module.exports = fp(fastifySqlite, {
  name: 'fastify-sqlite',
  fastify: '^4.x'
})

// let the user access the sqlite3 mode constants eg: sqlite3.OPEN_READONLY
module.exports.sqlite3 = sqlite3
