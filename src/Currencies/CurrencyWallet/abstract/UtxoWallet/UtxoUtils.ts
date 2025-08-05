import { NumberLike, toDecimal } from '../../../../InternalUtils/NumberLike'
import Decimal from 'decimal.js'

export function toSatoshi(amount: NumberLike): Decimal {
    return toDecimal(amount).mul(1_0000_0000)
}

export function toBase(amount: NumberLike): Decimal {
    return toDecimal(amount).div(1_0000_0000)
}
