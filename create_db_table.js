const dotenv = require('dotenv');
const result = dotenv.config({ path: './postgres.env' });
 
if (result.error) {
  throw result.error
}

let knex = require('knex')({
  client: 'postgres',
  connection: {
      host : process.env.DB_HOST,
      user : process.env.DB_USER,
      password : process.env.DB_PASS,
      database : process.env.DB_NAME
  },
  pool: { min: 0, max: 7 }
})

knex.schema.createTable('trade_info', function(table) {
  table.increments('id');
  table.integer('order_id');
  table.timestamp('timestamp');
  table.float('trx_sold');
  table.float('usdt_received');

  table.index(['timestamp'], 'timestamp_index');
}).then((res)=>{console.log(res); process.exit();})
  .catch(function(err) {console.log(err)})


