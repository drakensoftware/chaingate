import Decimal from 'decimal.js'

export type Txo = {
    txid: string,
    amount: Decimal,
    n: number,
    script: Uint8Array
}
