'use strict'

const fp = require('fastify-plugin')
const fs = require('node:fs/promises')
const path = require('node:path')
const { DatabaseSync, constants } = require('node:sqlite')

const setupVerboseTracing = require('./lib/tracing')

// Legacy sqlite3 mode constants, kept so existing users that read
// `fastifySqlite.sqlite3.OPEN_READONLY` keep working. Only the
// `OPEN_READONLY` flag is actually honored because `node:sqlite` always
// opens files in read-write mode and creates them when missing unless
// `readOnly` is set.
const SQLITE_OPEN_READONLY = 0x00000001
const SQLITE_OPEN_READWRITE = 0x00000002
const SQLITE_OPEN_CREATE = 0x00000004
const SQLITE_OPEN_FULLMUTEX = 0x00010000

function fastifySqlite (fastify, opts, next) {
  const filename = opts.dbFile || ':memory:'
  const dbOptions = buildDatabaseOptions(opts)

  let db
  try {
    db = new DatabaseSync(filename, dbOptions)
  } catch (err) {
    return next(err)
  }

  // Attach the Promise-based migrations helper. The underlying database
  // is synchronous, but reading the migration files is async, so we
  // expose an async API to keep the call site pleasant.
  db.migrate = migrate

  if (opts.verbose === true) {
    setupVerboseTracing(fastify, db)
  }

  decorateFastifyInstance(fastify, db, opts, next)
}

function buildDatabaseOptions (opts) {
  // Translate the legacy numeric `mode` option to the `node:sqlite`
  // options object. The new API only distinguishes read-only mode;
  // every other behaviour (read/write, create-on-open, threading) is
  // the default.
  if (typeof opts.mode === 'number') {
    return {
      readOnly: (opts.mode & SQLITE_OPEN_READONLY) === SQLITE_OPEN_READONLY
    }
  }
  return {}
}

async function migrate ({ migrationsPath } = {}) {
  if (typeof migrationsPath !== 'string' || migrationsPath.length === 0) {
    throw new Error('migrationsPath must be a non-empty string')
  }

  // Create the bookkeeping table on first run.
  this.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    run_at INTEGER NOT NULL
  )`)

  const files = (await fs.readdir(migrationsPath))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    return []
  }

  const alreadyRun = new Set(
    this.prepare('SELECT name FROM _migrations').all().map((row) => row.name)
  )

  const insertMigration = this.prepare(
    'INSERT INTO _migrations (name, run_at) VALUES (?, ?)'
  )

  const ranFiles = []
  for (const file of files) {
    if (alreadyRun.has(file)) {
      continue
    }

    const sql = await fs.readFile(path.join(migrationsPath, file), 'utf8')
    // Each migration file follows the convention used by the legacy
    // `sqlite` wrapper: an "Up" section first, then a `-- Down` marker
    // that separates the "Down" section we do not execute here.
    const upSection = sql.split(/^--.*Down.*$/m)[0]

    // Each migration runs in its own transaction. Already-committed
    // migrations stay committed when a later one fails.
    this.exec('BEGIN')
    try {
      this.exec(upSection)
      insertMigration.run(file, Date.now())
      this.exec('COMMIT')
      ranFiles.push(file)
    } catch (err) {
      this.exec('ROLLBACK')
      throw err
    }
  }

  return ranFiles
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

// Legacy sqlite3 mode constants, kept for backward compatibility.
// Existing code that does `fastifySqlite.sqlite3.OPEN_READONLY` keeps
// compiling against the new release.
module.exports.sqlite3 = Object.freeze({
  OPEN_READONLY: SQLITE_OPEN_READONLY,
  OPEN_READWRITE: SQLITE_OPEN_READWRITE,
  OPEN_CREATE: SQLITE_OPEN_CREATE,
  OPEN_FULLMUTEX: SQLITE_OPEN_FULLMUTEX
})

// Constants exposed by the built-in `node:sqlite` module.
module.exports.constants = constants

// The `DatabaseSync` class so users that want to instantiate databases
// outside the plugin can do so without an extra `require('node:sqlite')`.
module.exports.DatabaseSync = DatabaseSync
