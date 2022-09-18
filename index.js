'use strict'

const fp = require('fastify-plugin')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

function fastifySqlite (fastify, opts, next) {
  const Sqlite = (opts.verbose === true)
    ? sqlite3.verbose()
    : sqlite3

  const filename = opts.dbFile || ':memory:'
  const mode = opts.mode || (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE | sqlite3.OPEN_FULLMUTEX)

  if (opts.promiseApi === true) {
    open({
      filename,
      mode,
      driver: Sqlite.Database
    }).then(setupDatabase, setupDatabase)
  } else {
    // eslint-disable-next-line
    new Sqlite.Database(filename, mode, setupDatabase)
  }

  function setupDatabase (err) {
    if (err && err instanceof Error) {
      return next(err)
    }
    const db = err || this

    if (opts.verbose === true) {
      db.on('trace', function (trace) {
        fastify.log.trace({ sql: trace }, 'sqlite verbose trace')
      })
    }

    decorateFastifyInstance(fastify, db, opts, next)
  }
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
  const isProm = this.close(done)
  if (isProm?.then) {
    isProm.then(done, done)
  }
}

module.exports = fp(fastifySqlite, {
  name: 'fastify-sqlite',
  fastify: '^4.x'
})

// let the user access the sqlite3 mode constants eg: sqlite3.OPEN_READONLY
module.exports.sqlite3 = sqlite3
