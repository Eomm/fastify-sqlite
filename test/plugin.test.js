'use strict'

const path = require('node:path')
const fs = require('node:fs/promises')
const os = require('node:os')
const { test } = require('node:test')
const Fastify = require('fastify')
const plugin = require('../index')

let tmpCounter = 0
function tmpFile (suffix = '.db') {
  const filename = path.join(os.tmpdir(), `fastify-sqlite-${process.pid}-${Date.now()}-${++tmpCounter}${suffix}`)
  // Make sure the file does not pre-exist so tests start from a clean state.
  return fs.rm(filename, { force: true }).then(() => filename)
}

// `node:sqlite` returns rows with a null prototype so they compare
// strictly equal via `===`. For deepStrictEqual we want plain objects.
const asRows = (rows) => rows.map((row) => ({ ...row }))

test('decorates fastify with the database instance', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  t.assert.ok(app.sqlite, 'app.sqlite is defined')
  t.assert.strictEqual(typeof app.sqlite.prepare, 'function')
  t.assert.strictEqual(typeof app.sqlite.exec, 'function')
  t.assert.strictEqual(typeof app.sqlite.close, 'function')
})

test('uses :memory: when dbFile is not provided', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  t.assert.strictEqual(app.sqlite.location(), null)
})

test('opens the configured file when dbFile is provided', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  const filename = await tmpFile()
  app.register(plugin, { dbFile: filename })
  await app.ready()

  // `node:sqlite` returns the real path (with symlinks resolved),
  // which on macOS differs from `os.tmpdir()` because the latter
  // is a symlink under `/var/folders` -> `/private/var/folders`.
  t.assert.strictEqual(
    await fs.realpath(app.sqlite.location()),
    await fs.realpath(filename)
  )
})

test('runs a basic query through prepare/all', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  app.sqlite.exec('CREATE TABLE foo (id INTEGER PRIMARY KEY, txt TEXT)')
  app.sqlite.prepare('INSERT INTO foo (txt) VALUES (?)').run('hello')

  const rows = asRows(app.sqlite.prepare('SELECT * FROM foo').all())
  t.assert.deepStrictEqual(rows, [{ id: 1, txt: 'hello' }])
})

test('verbose mode logs trace for exec and prepare', async (t) => {
  const createSql = 'CREATE TABLE foo (id INT, txt TEXT)'
  const insertSql = 'INSERT INTO foo (txt) VALUES (?)'
  const allSql = 'SELECT * FROM foo'
  const getSql = 'SELECT * FROM foo WHERE id = 1'
  const iterateSql = 'SELECT * FROM foo'

  const traceCalls = []

  const fakeLogger = Object.create(null)
  for (const level of ['info', 'error', 'debug', 'fatal', 'warn']) {
    fakeLogger[level] = function () {}
  }
  fakeLogger.trace = function (msg) { traceCalls.push(msg) }
  fakeLogger.child = function () { return fakeLogger }

  const app = Fastify({ loggerInstance: fakeLogger })
  t.after(() => app.close())

  app.register(plugin, { verbose: true })
  await app.ready()

  // exec is logged once
  app.sqlite.exec(createSql)
  t.assert.deepStrictEqual(
    traceCalls[0],
    { sql: createSql },
    'exec is traced'
  )

  // prepare().run() is traced once
  const insert = app.sqlite.prepare(insertSql)
  insert.run('a')
  t.assert.deepStrictEqual(
    traceCalls[1],
    { sql: insertSql },
    'prepare().run() is traced'
  )

  // prepare().all() is traced
  app.sqlite.prepare(allSql).all()
  t.assert.deepStrictEqual(
    traceCalls[2],
    { sql: allSql },
    'prepare().all() is traced'
  )

  // prepare().get() is traced
  app.sqlite.prepare(getSql).get()
  t.assert.deepStrictEqual(
    traceCalls[3],
    { sql: getSql },
    'prepare().get() is traced'
  )

  // prepare().iterate() is traced
  // eslint-disable-next-line no-unused-vars
  for (const _ of app.sqlite.prepare(iterateSql).iterate()) { /* drain */ }
  t.assert.deepStrictEqual(
    traceCalls[4],
    { sql: iterateSql },
    'prepare().iterate() is traced'
  )
})

test('verbose mode is off by default', async (t) => {
  const traceCalls = []

  const fakeLogger = Object.create(null)
  for (const level of ['info', 'error', 'debug', 'fatal', 'warn']) {
    fakeLogger[level] = function () {}
  }
  fakeLogger.trace = function (msg) { traceCalls.push(msg) }
  fakeLogger.child = function () { return fakeLogger }

  const app = Fastify({ loggerInstance: fakeLogger })
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  app.sqlite.exec('CREATE TABLE foo (id INT, txt TEXT)')
  app.sqlite.prepare('INSERT INTO foo (txt) VALUES (?)').run('hello')
  app.sqlite.prepare('SELECT * FROM foo').all()

  t.assert.strictEqual(traceCalls.length, 0, 'no trace logs are emitted')
})

test('supports multiple named databases', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin, { name: 'db1' })
  app.register(plugin, { name: 'db2' })
  await app.ready()

  t.assert.ok(app.sqlite.db1)
  t.assert.ok(app.sqlite.db2)

  app.sqlite.db1.exec('CREATE TABLE foo (id INT)')
  app.sqlite.db2.exec('CREATE TABLE bar (id INT)')

  app.sqlite.db1.prepare('INSERT INTO foo (id) VALUES (?)').run(1)
  app.sqlite.db2.prepare('INSERT INTO bar (id) VALUES (?)').run(2)

  t.assert.deepStrictEqual(
    asRows(app.sqlite.db1.prepare('SELECT * FROM foo').all()),
    [{ id: 1 }]
  )
  t.assert.deepStrictEqual(
    asRows(app.sqlite.db2.prepare('SELECT * FROM bar').all()),
    [{ id: 2 }]
  )
})

test('throws when two anonymous connections are registered', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  app.register(plugin)

  await t.assert.rejects(
    app.ready(),
    /fastify-sqlite has been already registered/
  )
})

test('throws when two connections share the same name', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin, { name: 'db1' })
  app.register(plugin, { name: 'db1' })

  await t.assert.rejects(
    app.ready(),
    /Connection name \[db1\] already registered/
  )
})

test('opens in read-only mode when OPEN_READONLY is set', async (t) => {
  // Pre-create a DB that we can open in read-only mode afterwards.
  const filename = await tmpFile()
  {
    const writer = new plugin.DatabaseSync(filename)
    writer.exec('CREATE TABLE foo (id INT)')
    writer.close()
  }

  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin, {
    dbFile: filename,
    mode: plugin.sqlite3.OPEN_READONLY
  })

  await app.ready()

  // Writing must fail in read-only mode.
  t.assert.throws(
    () => app.sqlite.prepare('INSERT INTO foo (id) VALUES (?)').run(1),
    /attempt to write a readonly database/
  )

  await fs.rm(filename, { force: true })
})

test('fails when the file does not exist in read-only mode', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin, {
    dbFile: await tmpFile(),
    mode: plugin.sqlite3.OPEN_READONLY
  })

  await t.assert.rejects(
    app.ready(),
    /unable to open database file/
  )
})

test('closes the database when the fastify instance closes', async (t) => {
  const app = Fastify()

  app.register(plugin)
  await app.ready()

  const db = app.sqlite
  await app.close()

  t.assert.throws(
    () => db.exec('SELECT 1'),
    /database is not open/
  )
})

test('forwards close errors through the onClose hook', async (t) => {
  const app = Fastify()
  app.register(plugin)
  await app.ready()

  // Closing the database twice surfaces the second error through
  // the onClose hook registered by the plugin.
  app.sqlite.close()

  await t.assert.rejects(app.close(), /database is not open/)
})

test('refuses a wrong fastify version', async (t) => {
  const app = Fastify()

  Object.defineProperty(app, 'version', {
    value: '4.0.0'
  })

  app.register(plugin)

  await t.assert.rejects(
    app.ready(),
    /expected '\^5\.x' fastify version/
  )
})

test('exposes node:sqlite constants and DatabaseSync on the plugin', (t) => {
  t.assert.ok(plugin.constants, 'constants export is defined')
  t.assert.strictEqual(typeof plugin.constants, 'object')
  t.assert.strictEqual(typeof plugin.DatabaseSync, 'function')
  t.assert.strictEqual(plugin.DatabaseSync.name, 'DatabaseSync')
})

test('exposes legacy sqlite3 mode flags on plugin.sqlite3', (t) => {
  t.assert.strictEqual(plugin.sqlite3.OPEN_READONLY, 1)
  t.assert.strictEqual(plugin.sqlite3.OPEN_READWRITE, 2)
  t.assert.strictEqual(plugin.sqlite3.OPEN_CREATE, 4)
  t.assert.strictEqual(plugin.sqlite3.OPEN_FULLMUTEX, 65536)
})
