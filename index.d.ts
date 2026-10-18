import type { FastifyPluginCallback, FastifyInstance } from 'fastify'
import type { DatabaseSync } from 'node:sqlite'

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * The database instance, or a dictionary of named databases when
     * the `name` option is used.
     */
    sqlite?: DatabaseSync | Record<string, DatabaseSync>
  }
}

declare namespace fastifySqlite {
  interface SqlitePluginOptions {
    /**
     * Path to the SQLite database file. Use `':memory:'` for an
     * in-memory database.
     *
     * @default ':memory:'
     */
    dbFile?: string

    /**
     * Decorator name for this database connection.
     * - When not set, the database is decorated as `fastify.sqlite`.
     * - When set, the database is decorated as `fastify.sqlite[name]`.
     *
     * @default undefined
     */
    name?: string

    /**
     * When `true`, every SQL statement is logged through
     * `fastify.log.trace({ sql })` for debugging.
     *
     * @default false
     */
    verbose?: boolean

    /**
     * Legacy sqlite3 numeric open-mode flags. Only `OPEN_READONLY`
     * is honoured because the built-in `node:sqlite` always opens
     * files in read-write mode and creates them when missing.
     *
     * @default undefined (read-write + create)
     */
    mode?: number
  }

  /**
   * Options accepted by `db.migrate()`.
   */
  interface MigrateOptions {
    /**
     * Path to the directory containing the migration `.sql` files.
     * Files are executed in alphabetical order. Files may include a
     * `-- Down` marker to separate the rollback section from the
     * upgrade section; only the upgrade section is executed.
     *
     * Each migration runs in its own transaction: already-committed
     * migrations stay committed if a later one fails.
     */
    migrationsPath: string
  }
}

type FastifySqlitePlugin = FastifyPluginCallback<fastifySqlite.SqlitePluginOptions>

interface FastifySqliteExtras {
  /**
   * Legacy `sqlite3` open-mode constants, kept for backward
   * compatibility. Access them as `fastifySqlite.sqlite3.OPEN_READONLY`.
   */
  sqlite3: {
    readonly OPEN_READONLY: 1
    readonly OPEN_READWRITE: 2
    readonly OPEN_CREATE: 4
    readonly OPEN_FULLMUTEX: 65536
  }

  /** Constants exposed by the built-in `node:sqlite` module. */
  constants: typeof import('node:sqlite').constants

  /** The `DatabaseSync` class from the built-in `node:sqlite` module. */
  DatabaseSync: typeof DatabaseSync
}

declare const fastifySqlite: FastifySqlitePlugin & FastifySqliteExtras

export = fastifySqlite