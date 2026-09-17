/**
 * MySQL connectivity probe for BoardEase.
 *
 * Usage:  node check-db.mjs [port]
 *   - no argument: tries 3306 then 3307 (XAMPP's usual fallback port)
 *   - with argument: tries only that port, e.g. `node check-db.mjs 3307`
 *
 * Prints whether a connection succeeds, the server version, and whether the
 * `boardease` database exists — everything needed to fix a failed sign-in.
 */
import mysql from 'mysql2/promise'

const ports = process.argv[2] ? [Number(process.argv[2])] : [3306, 3307]

for (const port of ports) {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      connectTimeout: 4000,
    })
    const [ver] = await conn.query('SELECT VERSION() AS v')
    const [dbs] = await conn.query("SHOW DATABASES LIKE 'boardease'")
    console.log(`✅ Port ${port}: connected (server ${ver[0].v}). boardease DB: ${dbs.length > 0 ? 'found' : 'MISSING — import database/boardease.sql'}`)
    await conn.end()
  } catch (e) {
    console.log(`❌ Port ${port}: ${e.code || e.message}`)
  }
}
