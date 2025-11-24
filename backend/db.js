const mysql = require('mysql2');

// Load dotenv here too for diagnostics (no harm if already loaded)
try { require('dotenv').config(); } catch (e) { }

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_USER = process.env.DATABASE_USER || 'root';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_NAME = process.env.DATABASE_NAME || 'pwa';

// Diagnostic log (do NOT log the password)
console.log(`DB config -> host=${DB_HOST}, user=${DB_USER}, database=${DB_NAME}, hasPassword=${DB_PASSWORD ? 'yes' : 'no'}`);

if (process.env.NODE_ENV === 'production' && !DB_PASSWORD) {
  console.error('ERROR: DATABASE_PASSWORD is not set. Set DATABASE_PASSWORD in the environment before starting in production.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Try a quick connection test and log friendly error if it fails
(async () => {
  try {
    const promisePool = pool.promise();
    const [rows] = await promisePool.execute('SELECT 1');
    // connection successful; nothing else to do
  } catch (err) {
    console.error('DB connection test failed:', err && err.message ? err.message : err);
  }
})();

module.exports = pool.promise();
