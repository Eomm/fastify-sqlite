import { expectType } from 'tsd'

import fastifyFactory, { FastifyInstance } from 'fastify'
import { DatabaseSync } from 'node:sqlite'

import sqlitePlugin, { SqlitePluginOptions } from '../../index'

const optionsNone: SqlitePluginOptions = {}
const options1: SqlitePluginOptions = { dbFile: 'foo.db' }
const options2: SqlitePluginOptions = { name: 'db1' }
const options3: SqlitePluginOptions = { verbose: true }
const options4: SqlitePluginOptions = { mode: 1 }
const options5: SqlitePluginOptions = {
  dbFile: ':memory:',
  name: 'main',
  verbose: true,
  mode: 1
}

const fastify: FastifyInstance = fastifyFactory()
fastify.register(sqlitePlugin, optionsNone)
fastify.register(sqlitePlugin, options1)
fastify.register(sqlitePlugin, options2)
fastify.register(sqlitePlugin, options3)
fastify.register(sqlitePlugin, options4)
fastify.register(sqlitePlugin, options5)

// The decorator is either a single database or a dictionary.
expectType<DatabaseSync | Record<string, DatabaseSync> | undefined>(fastify.sqlite)

// Legacy sqlite3 constants keep working through the plugin.
expectType<1>(sqlitePlugin.sqlite3.OPEN_READONLY)
expectType<2>(sqlitePlugin.sqlite3.OPEN_READWRITE)
expectType<4>(sqlitePlugin.sqlite3.OPEN_CREATE)
expectType<65536>(sqlitePlugin.sqlite3.OPEN_FULLMUTEX)

// The new constants and DatabaseSync are re-exported.
expectType<typeof import('node:sqlite').constants>(sqlitePlugin.constants)
expectType<typeof DatabaseSync>(sqlitePlugin.DatabaseSync)

// Default export works for ESM-style imports.
import sqlitePluginDefault from '../../index'
expectType<typeof sqlitePlugin>(sqlitePluginDefault)