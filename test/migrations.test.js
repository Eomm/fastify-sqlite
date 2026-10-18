'use strict'

const path = require('node:path')
const fs = require('node:fs/promises')
const os = require('node:os')
const { test } = require('node:test')
const Fastify = require('fastify')
const plugin = require('../index')

const migrationsPath = path.join(__dirname, 'migrations')

// `node:sqlite` returns rows with a null prototype so they compare
// strictly equal via `===`. For deepStrictEqual we want plain objects.
const asRows = (rows) => rows.map((row) => ({ ...row }))

test('migrate runs every .sql file once', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  const ran = await app.sqlite.migrate({ migrationsPath })

  t.assert.deepStrictEqual(ran, ['001-init.sql', '002-data.sql'])

  const tables = app.sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name)

  t.assert.ok(tables.includes('Family'))
  t.assert.ok(tables.includes('Person'))
  t.assert.ok(tables.includes('Friend'))
  t.assert.ok(tables.includes('_migrations'))
})

test('migrate is idempotent', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  const first = await app.sqlite.migrate({ migrationsPath })
  const second = await app.sqlite.migrate({ migrationsPath })

  t.assert.deepStrictEqual(first, ['001-init.sql', '002-data.sql'])
  t.assert.deepStrictEqual(second, [], 'no migrations run a second time')
})

test('migrate skips the "-- Down" section of each file', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  await app.sqlite.migrate({ migrationsPath })

  // The "Down" sections drop tables. If they had been executed, the
  // schema would be empty afterwards.
  const tables = app.sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((row) => row.name)

  t.assert.ok(tables.includes('Family'))
  t.assert.ok(tables.includes('Person'))
})

test('migrate rolls back the failing migration while keeping earlier ones committed', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  const faulty = path.join(os.tmpdir(), `fastify-sqlite-faulty-${process.pid}-${Date.now()}`)
  await fs.mkdir(faulty, { recursive: true })
  await fs.writeFile(path.join(faulty, '001-good.sql'), 'CREATE TABLE bar (id INT);')
  await fs.writeFile(path.join(faulty, '002-bad.sql'), 'THIS IS NOT VALID SQL;')

  app.register(plugin)
  await app.ready()

  await t.assert.rejects(
    app.sqlite.migrate({ migrationsPath: faulty }),
    /syntax error|SQL logic error|not a valid/
  )

  // 001-good was committed before the failure; 002-bad was rolled back.
  const migrations = asRows(
    app.sqlite.prepare('SELECT name FROM _migrations ORDER BY id').all()
  )
  t.assert.deepStrictEqual(migrations, [{ name: '001-good.sql' }])

  // The `bar` table from 001-good is still around.
  const tables = asRows(
    app.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'bar'")
      .all()
  )
  t.assert.deepStrictEqual(tables, [{ name: 'bar' }])

  await fs.rm(faulty, { recursive: true, force: true })
})

test('migrate throws when migrationsPath is missing', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  await t.assert.rejects(
    app.sqlite.migrate({}),
    /migrationsPath must be a non-empty string/
  )
})

test('migrate returns an empty array when the directory has no .sql files', async (t) => {
  const emptyDir = path.join(os.tmpdir(), `fastify-sqlite-empty-${process.pid}-${Date.now()}`)
  await fs.mkdir(emptyDir, { recursive: true })

  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  const ran = await app.sqlite.migrate({ migrationsPath: emptyDir })
  t.assert.deepStrictEqual(ran, [])

  await fs.rm(emptyDir, { recursive: true, force: true })
})

test('joins data through the public API after migration', async (t) => {
  const app = Fastify()
  t.after(() => app.close())

  app.register(plugin)
  await app.ready()

  await app.sqlite.migrate({ migrationsPath })

  const johnFriends = app.sqlite.prepare(`
    SELECT * FROM Person
      JOIN Friend ON Person.id = Friend.personId
      JOIN Person AS FriendPerson ON Friend.friendId = FriendPerson.id
      WHERE Person.name = 'John'
  `).all()

  t.assert.strictEqual(johnFriends.length, 3)
})
