# fastify-sqlite

[![ci](https://github.com/Eomm/fastify-sqlite/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Eomm/fastify-sqlite/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/fastify-sqlite)](https://www.npmjs.com/package/fastify-sqlite)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Fastify plugin to connect to a SQLite database.

Under the hood, this plugin uses the built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module
that ships with Node.js. It works on **Node.js `>=22.5.0`** where `node:sqlite` is available
as an experimental feature.

## Install

```
npm install fastify-sqlite
```

### Compatibility

| Plugin version | Fastify version | Node.js version |
| ------------- |:---------------:|:---------------:|
| `^2.0.0` | `^5.0.0` | `>=22.5.0` |
| `^1.0.0` | `^4.0.0` | `>=18` |


## Usage

```js
const Fastify = require('fastify')
const fastifySqlite = require('fastify-sqlite')

async function main () {
  const app = Fastify()
  app.register(fastifySqlite, {
    dbFile: 'foo.db'
  })
  await app.ready()

  // node:sqlite exposes a synchronous API.
  // Prepare it, then run the query.
  const rows = app.sqlite.prepare('SELECT * FROM myTable').all()
  console.log(rows)
}

main()
```

Check the [`node:sqlite` documentation](https://nodejs.org/api/sqlite.html#class-databasesync) to see
all the methods available on `DatabaseSync` and `StatementSync`.

## Options

You can pass the following options to the plugin:

```js
await app.register(require('fastify-sqlite'), {
  dbFile: ':memory:',         // path to the DB file. Default ':memory:'
  name: 'mydb',               // optional decorator name. Default null
  verbose: true,              // log every SQL statement via fastify.log.trace. Default false
  mode: fastifySqlite.sqlite3.OPEN_READONLY // legacy sqlite3 mode flags. Default read-write + create
})
```

When the `name` option is set, the database is exposed at `fastify.sqlite[name]` instead of
`fastify.sqlite`:

```js
await app.register(require('fastify-sqlite'), { name: 'main' })
app.sqlite.main.prepare('SELECT 1').get()
```

### `mode`

The `mode` option accepts the legacy [`sqlite3`](https://github.com/TryGhost/node-sqlite3) numeric
flags. Only `OPEN_READONLY` is honoured by `node:sqlite` — all other flags are ignored because
`node:sqlite` always opens files in read-write mode and creates them when missing.

If you prefer a friendlier API you can just rely on the legacy constants:

```js
mode: fastifySqlite.sqlite3.OPEN_READONLY // 1
mode: fastifySqlite.sqlite3.OPEN_READWRITE // 2
mode: fastifySqlite.sqlite3.OPEN_CREATE // 4
mode: fastifySqlite.sqlite3.OPEN_FULLMUTEX // 65536
```

## Verbose mode

When `verbose: true`, every SQL statement is forwarded to `fastify.log.trace({ sql })`:

```js
app.register(fastifySqlite, { verbose: true })
app.sqlite.exec('CREATE TABLE foo (id INT)')
// fastify.log.trace receives { sql: 'CREATE TABLE foo (id INT)' }
```

Both `db.exec(sql)` and `db.prepare(sql).run() / .all() / .get() / .iterate()` are traced.

## Migrations

The plugin ships with a tiny migration helper attached to every database instance:

```js
await app.sqlite.migrate({
  migrationsPath: './migrations'
})
```

- Migration files must end with `.sql` and are executed in alphabetical order.
- Each file may include a `-- Down` marker to separate the rollback section from the upgrade
  section; only the upgrade section is executed.
- A `_migrations` table tracks which files have already run, so calling `migrate()` again
  is a no-op.
- Each migration runs in its own transaction. If a migration fails, only that one is rolled
  back; previously committed migrations stay committed.
- The call returns the array of files that have been executed.

## TypeScript

The plugin ships with `index.d.ts`. The database decorator is typed as
`DatabaseSync | Record<string, DatabaseSync> | undefined` and the options as
`SqlitePluginOptions`:

```ts
import Fastify from 'fastify'
import sqlitePlugin, { SqlitePluginOptions } from 'fastify-sqlite'

const app = Fastify()
app.register(sqlitePlugin, {
  dbFile: 'foo.db',
  name: 'main'
} satisfies SqlitePluginOptions)
```

## License

Copyright [Manuel Spigolon](https://github.com/Eomm), Licensed under [MIT](./LICENSE).