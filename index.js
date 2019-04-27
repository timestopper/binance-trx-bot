const dotenv = require('dotenv');
const result = dotenv.config({ path: './postgres.env' });
 
if (result.error) {
  throw result.error
}


const chalk       = require('chalk')
//const moment      = require('moment')
const _           = require('lodash')
const clear       = require('clear')
const binance     = require('binance-api-node').default
const setTitle    = require('node-bash-title')

//////////////////////////////////////////////////////////////////////////////////
// https://www.binance.com/restapipub.html
// REPLACE xxx with your own API key key and secret.
//
const APIKEY = 'xxx'
const APISECRET = 'xxx'
//////////////////////////////////////////////////////////////////////////////////


// Binance API initialization //
const client = binance({apiKey: APIKEY, apiSecret: APISECRET, useServerTime: true})

// db connection
const knex = require('knex')({
  client: 'postgres',
  connection: {
      host : process.env.DB_HOST,
      user : process.env.DB_USER,
      password : process.env.DB_PASS,
      database : process.env.DB_NAME
  },
  pool: { min: 0, max: 7 }
})


clear()

console.log(' ')
console.log(chalk.green(' SIMPLE BINANCE BOT '))
console.log(' ')

function delay(t, val) {
  return new Promise(function(resolve) {
      setTimeout(function() {
          resolve(val);
      }, t);
  });
}

const trySellTRX = async() => {

    const pair = 'TRXUSDT'

    const BASE_CURRENCY = 'TRX' 
    const MIN_EXCHANGE_AMOUNT = 300 

    const accountData = await client.accountInfo()
    const trxData = _.find(accountData.balances, {asset:BASE_CURRENCY})
    const trxBalance = parseFloat(_.get(trxData, 'free'))
    console.log('trxBalance', trxBalance)
    if ( !(trxBalance && trxBalance > MIN_EXCHANGE_AMOUNT)) {
      console.log('Insufficient TRX balance');
      return;
    }

    const exchangeInfo = await client.exchangeInfo()

    if (!_.filter(exchangeInfo.symbols, {symbol: pair}).length > 0) {
      console.log(chalk.magenta("SORRY THE PAIR ") + chalk.green(pair) + chalk.magenta(" IS UNKNOWN BY BINANCE. Please try another one."))
    }
    setTitle('🐬 ' + pair + ' 🐬 ')
    //const tickSize = _.filter(exchangeInfo.symbols, {symbol: pair})[0].filters[0].tickSize.indexOf("1") - 1
    //const stepSize = _.filter(exchangeInfo.symbols, {symbol: pair})[0].filters[2].stepSize

    const orderRes = await client.order({
      symbol: pair,
      type: 'MARKET',
      side: 'SELL',
      quantity: trxBalance
    })

    //console.log(orderRes)
    // example of binance response

    //   const orderRes = { symbol: 'TRXUSDT',
    // orderId: 54299117,
    // clientOrderId: 'yND46afQmXMJv6syM15igk',
    // transactTime: 1556228840021,
    // price: '0.00000000',
    // origQty: '500.00000000',
    // executedQty: '500.00000000',
    // cummulativeQuoteQty: '12.25500000',
    // status: 'FILLED',
    // timeInForce: 'GTC',
    // type: 'MARKET',
    // side: 'SELL',
    // fills: 
    //  [ { price: '0.02451000',
    //      qty: '500.00000000',
    //      commission: '0.01225500',
    //      commissionAsset: 'USDT',
    //      tradeId: 11403641 } ] }


    // Put in a db, entries:
    // Order ID, Amount TRX sold, Amount USDT received, Date of Order

    let dbDate = { }
    dbDate.timestamp = new Date( _.get(orderRes, 'transactTime') )
    dbDate.order_id = _.get(orderRes, 'orderId')
    dbDate.trx_sold = _.get(orderRes, 'executedQty')
    const usdt_commission = parseFloat( _.get(orderRes, 'fills[0].commission') )
    const usdt_with_commission = parseFloat( _.get(orderRes, 'cummulativeQuoteQty') ) - usdt_commission
    dbDate.usdt_received = usdt_with_commission

    const DB_TABLE_NAME = 'trade_info'
    const insertRes = await knex.insert(dbDate).into( DB_TABLE_NAME )
    const dbRes = await knex(DB_TABLE_NAME).select()
    

    // below example how to get first bid and first ask prices on binance book order

    // const bookRes = await client.book({ symbol: pair })
    // const bid_price = parseFloat(bookRes.bids[0].price)
    // const ask_price = parseFloat(bookRes.asks[0].price)
    // console.log( chalk.grey(moment().format('h:mm:ss').padStart(8))
    //   + chalk.yellow(pair.padStart(10))
    //   + chalk.grey(" CURRENT 1ST BID PRICE: " + bid_price )
    //   + chalk.grey(" CURRENT 1ST ASK PRICE: " + ask_price ))

}

const INTERVAL_TIMER = 60000

const run = async()=>{
  try {
    await trySellTRX()
  } catch (e) {
    console.log(e)
  }
  await delay(INTERVAL_TIMER)
  await run()
}

run()