require('dotenv').config(); // Обязательно первым
const { Client } = require('pg');

const dtbs = process.env.PGDATABASE;

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: dtbs,
});

client.connect()
  .then(() => {
    console.log(`connected to database: '${dtbs}' successful`);
  })
  .catch(() => {
    console.log(`connection to database: '${dtbs}' failed`);
  });

module.exports = client;