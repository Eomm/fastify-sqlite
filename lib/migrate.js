'use strict'

const fs = require('node:fs')
const path = require('node:path')

/**
 * Run every `.sql` file in `migrationsPath` against the given
 * `node:sqlite` `DatabaseSync` instance. The files are executed in
 * alphabetical order; already-applied ones are skipped.
 *
 * Each file is expected to follow the legacy `sqlite` convention: an
 * "Up" section first, then a `-- Down` marker that separates the
 * rollback section. Only the upgrade section is executed.
 *
 * Each migration runs in its own transaction: already-committed
 * migrations stay committed when a later one fails.
 *
 * The function is synchronous because migrations must run sequentially
 * and benefit from simpler control flow.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ migrationsPath: string }} options
 * @returns {string[]} the names of the files that were executed
 */
function migrateSqlite (db, { migrationsPath } = {}) {
  if (!db || typeof db.exec !== 'function') {
    throw new TypeError('migrateSqlite(db, options) expects a node:sqlite DatabaseSync as the first argument')
  }
  if (typeof migrationsPath !== 'string' || migrationsPath.length === 0) {
    throw new Error('migrationsPath must be a non-empty string')
  }

  // Create the bookkeeping table on first run.
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    run_at INTEGER NOT NULL
  )`)

  const files = fs.readdirSync(migrationsPath)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    return []
  }

  const alreadyRun = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((row) => row.name)
  )

  const insertMigration = db.prepare(
    'INSERT INTO _migrations (name, run_at) VALUES (?, ?)'
  )

  const ranFiles = []
  for (const file of files) {
    if (alreadyRun.has(file)) {
      continue
    }

    const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8')
    const upSection = sql.split(/^--.*Down.*$/m)[0]

    db.exec('BEGIN')
    try {
      db.exec(upSection)
      insertMigration.run(file, Date.now())
      db.exec('COMMIT')
      ranFiles.push(file)
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }

  return ranFiles
}

module.exports = migrateSqlite
module.exports.migrateSqlite = migrateSqlite
