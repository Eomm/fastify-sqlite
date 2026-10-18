import type { FastifyPluginCallback } from 'fastify'
import type { DatabaseSync } from 'node:sqlite'

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * The database instance, or a dictionary of named databases when
     * the `name` option is used.
     */
    sqlite?: DatabaseSync | Record<string, DatabaseSync>

    /**
     * Run every `.sql` file in `migrationsPath` against the given
     * `node:sqlite` `DatabaseSync` instance.
     *
     * @example
     * ```ts
     * app.migrateSqlite(app.sqlite, { migrationsPath: './migrations' })
     * ```
     */
    migrateSqlite: (db: DatabaseSync, options: fastifySqlite.MigrateOptions) => string[]
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
     * When `true`, the database is opened in read-only mode and every
     * write statement will fail.
     *
     * @default false
     */
    readOnly?: boolean

    /**
     * When `true`, every SQL statement is logged through
     * `fastify.log.trace({ sql })` for debugging.
     *
     * @default false
     */
    verbose?: boolean
  }

  /**
   * Options accepted by `fastify.migrateSqlite(db, options)`.
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
  /** Constants exposed by the built-in `node:sqlite` module. */
  constants: typeof import('node:sqlite').constants

  /** The `DatabaseSync` class from the built-in `node:sqlite` module. */
  DatabaseSync: typeof DatabaseSync
}

declare const fastifySqlite: FastifySqlitePlugin & FastifySqliteExtras

export = fastifySqlite
