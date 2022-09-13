'use strict'

const { test } = require('tap')
const fastify = require('fastify')
const plugin = require('../index')

test('basic test', async t => {
  const app = fastify()
  app.register(plugin)
  t.teardown(app.close.bind(app))

  await app.ready()

  t.ok(app.sqlite)
})

test('verbose mode', t => {
  t.plan(2)

  const createSql = 'CREATE TABLE foo (id INT, txt TEXT)'

  function Logger (...args) { this.args = args }
  Logger.prototype.info = function (msg) { t.fail() }
  Logger.prototype.error = function (msg) { t.fail() }
  Logger.prototype.debug = function (msg) { t.fail() }
  Logger.prototype.fatal = function (msg) { t.fail() }
  Logger.prototype.warn = function (msg) { t.fail() }
  Logger.prototype.trace = function (msg) { t.same(msg, { sql: createSql }) }
  Logger.prototype.child = function () { return new Logger() }

  const myLogger = new Logger()

  const app = fastify({
    logger: myLogger
  })
  app.register(plugin, {
    verbose: true
  })
  t.teardown(app.close.bind(app))

  app.ready()
    .then(() => {
      app.sqlite.run(createSql, () => {
        t.pass('table created')
      })
    })
})

test('multiple register', async t => {
  const app = fastify()
  app.register(plugin, { name: 'db1' })
  app.register(plugin, { name: 'db2' })
  t.teardown(app.close.bind(app))

  await app.ready()

  t.ok(app.sqlite.db1)
  t.ok(app.sqlite.db2)
})

test('multiple register same name error', async t => {
  const app = fastify()
  app.register(plugin, { name: 'db1' })
  app.register(plugin, { name: 'db1' })
  t.teardown(app.close.bind(app))

  try {
    await app.ready()
    t.fail('should throw')
  } catch (error) {
    t.match(error.message, 'Connection name [db1] already registered')
  }
})

test('multiple register error', async t => {
  const app = fastify()
  app.register(plugin)
  app.register(plugin)
  t.teardown(app.close.bind(app))

  try {
    await app.ready()
    t.fail('should throw')
  } catch (error) {
    t.match(error.message, 'fastify-sqlite has been already registered')
  }
})

test('sql connection error', async t => {
  const app = fastify()
  app.register(plugin, {
    dbFile: 'foobar.db',
    mode: plugin.sqlite3.OPEN_READONLY
  })
  t.teardown(app.close.bind(app))

  try {
    await app.ready()
    t.fail('should throw')
  } catch (error) {
    t.match(error.message, 'SQLITE_CANTOPEN: unable to open database file')
  }
})
