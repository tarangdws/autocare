const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.PGUSER || 'admin'}:${encodeURIComponent(process.env.PGPASSWORD || 'admin@123')}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5434}/${process.env.PGDATABASE || 'autocare_db'}`;

const pool = new Pool({
    connectionString,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
