'use strict'

const fp = require('fastify-plugin')
const { DatabaseSync, constants } = require('node:sqlite')

const setupVerboseTracing = require('./lib/tracing')
const migrateSqlite = require('./lib/migrate')

// Tracks whether `migrateSqlite` has already been decorated on the
// parent instance. We use a Symbol so the guard is invisible to user
// code and survives multiple plugin registrations (with or without
// the `name` option).
const kMigrateSqlite = Symbol('fastify-sqlite:migrateSqlite')

function fastifySqlite (fastify, opts, next) {
  const filename = opts.dbFile || ':memory:'
  const dbOptions = buildDatabaseOptions(opts)

  let db
  try {
    db = new DatabaseSync(filename, dbOptions)
  } catch (err) {
    return next(err)
  }

  if (opts.verbose === true) {
    setupVerboseTracing(fastify, db)
  }

  if (fastify[kMigrateSqlite] !== true) {
    fastify.decorate('migrateSqlite', migrateSqlite)
    fastify[kMigrateSqlite] = true
  }

  decorateFastifyInstance(fastify, db, opts, next)
}

function buildDatabaseOptions (opts) {
  // Translate the `readOnly` boolean to the `node:sqlite` options
  // object. The new API defaults to read-write + create-on-open.
  if (opts.readOnly === true) {
    return { readOnly: true }
  }
  return {}
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
  try {
    this.close()
    done()
  } catch (err) {
    done(err)
  }
}

const plugin = fp(fastifySqlite, {
  name: 'fastify-sqlite',
  fastify: '^5.x'
})

module.exports = plugin
module.exports.default = plugin

// Constants exposed by the built-in `node:sqlite` module.
module.exports.constants = constants

// The `DatabaseSync` class so users that want to instantiate databases
// outside the plugin can do so without an extra `require('node:sqlite')`.
module.exports.DatabaseSync = DatabaseSync
