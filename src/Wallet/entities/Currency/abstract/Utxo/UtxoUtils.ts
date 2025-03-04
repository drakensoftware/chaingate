import Decimal from 'decimal.js'

export function toSatoshi(amount: Decimal | bigint): Decimal {
    if(typeof amount == 'bigint') return new Decimal(amount.toString()).mul(1_0000_0000)
    else return amount.mul(new Decimal(1_0000_0000))
}

export function toBase(amount: Decimal | bigint): Decimal {
    if(typeof amount == 'bigint') return new Decimal(amount.toString()).div(1_0000_0000)
    else return amount.div(new Decimal(1_0000_0000))
}

