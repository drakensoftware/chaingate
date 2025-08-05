import Decimal from 'decimal.js'

export type NumberLike = string | number | bigint | Decimal

export function toDecimal(value: NumberLike): Decimal {
    if (typeof value == 'bigint') return new Decimal(value.toString())
    return new Decimal(value)
}
