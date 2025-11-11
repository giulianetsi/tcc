const mysql = require('mysql2');

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_USER = process.env.DATABASE_USER || 'root';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || 'changeme';
const DB_NAME = process.env.DATABASE_NAME || 'pwa';

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_PASSWORD) {
  console.error('ERROR: DATABASE_PASSWORD is not set. Set DATABASE_PASSWORD in the environment before starting in production.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME
});

module.exports = pool.promise();
