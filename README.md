# fastify-sqlite

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![ci](https://github.com/Eomm/fastify-sqlite/actions/workflows/ci.yml/badge.svg)](https://github.com/Eomm/fastify-sqlite/actions/workflows/ci.yml)

Fastify plugin to connect to a SQLite3 database.
Under the hood, this plugin uses [`sqlite3`](https://www.npmjs.com/package/sqlite3).

## Install

```
npm install fastify-sqlite
```

### Compatibility

| Plugin version | Fastify version |
| ------------- |:---------------:|
| `^1.0.0` | `^4.0.0` |


## Usage

```js
const fastifySqlite = require('fastify-sqlite')

async function main () {
  const app = fastify()
  app.register(fastifySqlite, {
    dbFile: 'foo.db'
  })
  await app.ready()

  app.sqlite.all('SELECT * FROM myTable', (err, rows) => {
    // do something
  })
}
main()
```

Checkout the [sqlite3 documentation](https://github.com/TryGhost/node-sqlite3/wiki/API) to see all the available methods.

Note that Promise APIs are not supported by the `sqlite3` module by default.
By using the `promiseApi` option, the [`sqlite`](https://github.com/kriasoft/node-sqlite) wrapper will be used
to enhance the Database instance. It has many convenient utilities such as `migration` support.

## Options

You can pass the following options to the plugin:

```js
await app.register(require('fastify-sqlite'), {
  promiseApi: true, // the DB instance supports the Promise API. Default false
  name: 'mydb', // optional decorator name. Default null
  verbose: true, // log sqlite3 queries as trace. Default false
  dbFile: ':memory:', // select the database file. Default ':memory:'
  mode: fastifySqlite.sqlite3.OPEN_READONLY 
    // how to connecto to the DB, Default: OPEN_READWRITE | OPEN_CREATE | OPEN_FULLMUTEX
})

// usage WITH name option
await app.sqlite.myDb.all('SELECT * FROM myTable')
```

## License

Copyright [Manuel Spigolon](https://github.com/Eomm), Licensed under [MIT](./LICENSE).
