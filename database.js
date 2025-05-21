const {Client} = require ('pg');
dtbs = 'todos'
const client = new Client({
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  password: 'root',
  database: 'todos', 
})
client.connect()
 .then (() => {
    console.log(`conneted to database:\'${dtbs}\' succeful`)
}).catch(()=>{
    console.log(`conneted to database:\'${dtbs}\' lost`)
})
module.exports = client;