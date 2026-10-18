'use strict'

const TRACE_MESSAGE = 'sqlite verbose trace'

/**
 * Wrap a `node:sqlite` `DatabaseSync` instance so that every executed
 * statement is forwarded to `fastify.log.trace({ sql })`. This matches
 * the behaviour of the old sqlite3 `trace` event.
 *
 * Both `db.exec(sql)` and `db.prepare(sql).run() / .all() / .get() /
 * .iterate()` are intercepted. The wrapping mutates the instance in
 * place because `node:sqlite` exposes only mutating methods on the
 * `DatabaseSync` prototype.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {import('node:sqlite').DatabaseSync} db
 */
function setupVerboseTracing (fastify, db) {
  // Wrap `exec` so single-shot SQL strings are logged too.
  const originalExec = db.exec.bind(db)
  db.exec = function exec (sql) {
    fastify.log.trace({ sql }, TRACE_MESSAGE)
    return originalExec(sql)
  }

  // Wrap `prepare` so every prepared statement logs on execution.
  const originalPrepare = db.prepare.bind(db)
  db.prepare = function prepare (sql) {
    const stmt = originalPrepare(sql)
    return wrapStatement(stmt, fastify)
  }
}

function wrapStatement (stmt, fastify) {
  const sql = stmt.sourceSQL
  const logTrace = () => {
    fastify.log.trace({ sql }, TRACE_MESSAGE)
  }

  const boundRun = stmt.run.bind(stmt)
  stmt.run = function run (...args) {
    logTrace()
    return boundRun(...args)
  }

  const boundAll = stmt.all.bind(stmt)
  stmt.all = function all (...args) {
    logTrace()
    return boundAll(...args)
  }

  const boundGet = stmt.get.bind(stmt)
  stmt.get = function get (...args) {
    logTrace()
    return boundGet(...args)
  }

  const boundIterate = stmt.iterate.bind(stmt)
  stmt.iterate = function iterate (...args) {
    logTrace()
    return boundIterate(...args)
  }

  return stmt
}

module.exports = setupVerboseTracing
module.exports.setupVerboseTracing = setupVerboseTracing
