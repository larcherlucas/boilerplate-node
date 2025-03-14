import { config } from 'dotenv';

config();

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', 
  port: 5432,        
  user: 'lucas',     
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  client_encoding: 'utf8',
  // ssl: {
  //   rejectUnauthorized: false,
  // },
});
pool.connect((err) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Successfully connected to database');
  }
});


export default pool;