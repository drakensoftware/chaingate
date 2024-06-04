import Decimal from 'decimal.js'
import BitcoinCurrencyAmount from './Currencies/Bitcoin/BitcoinCurrencyAmount'
import EthereumCurrencyAmount from './Currencies/Ethereum/EthereumCurrencyAmount'

function toDecimal(value: string | bigint){
    if(typeof value == 'bigint') value = value.toString()
    value = value.replace('_', '')
    return new Decimal(value)
}

export function Btc(amountBtc: string | bigint){
    return new BitcoinCurrencyAmount(toDecimal(amountBtc))
}

export function Satoshis(amountSatoshis: string | bigint){
    return new BitcoinCurrencyAmount(toDecimal(amountSatoshis).div(1_0000_0000))
}

export function Eth(amountEth: string | bigint){
    return new EthereumCurrencyAmount(toDecimal(amountEth))
}

export function Wei(amountWei: string | bigint){
    return new EthereumCurrencyAmount(toDecimal(amountWei).div('1000000000000000000'))
}

