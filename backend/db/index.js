// =============================================================================
// db/index.js – PostgreSQL connection pool
// =============================================================================
// We use a connection pool (via node-postgres `Pool`) rather than a single
// client because Express handles many concurrent requests. The pool maintains
// a set of idle connections that are reused across requests, which avoids the
// overhead of opening and closing a TCP connection on every query.
//
// Environment variables expected (set via .env in development):
//   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
// =============================================================================

const { Pool } = require('pg');

// Create the pool once – it is module-level so the same pool instance is
// shared across all files that require this module (Node's module cache ensures
// only one instance exists per process).
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'golf_tracker',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Log a warning if the pool emits an error on an idle client. Without this
// handler the error would be uncaught and could crash the process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

// Export a thin wrapper around pool.query so callers do not need to import
// Pool themselves. Keeping the interface minimal makes it straightforward to
// swap the underlying client library in the future.
module.exports = {
  /**
   * Execute a parameterised SQL query against the pool.
   * @param {string} text   - SQL string with $1, $2 … placeholders
   * @param {Array}  params - Values to bind to the placeholders
   * @returns {Promise<import('pg').QueryResult>}
   */
  query: (text, params) => pool.query(text, params),
};