import Decimal from 'decimal.js'

export enum AddressType {
    PubKeyHash,
    ScriptHash ,
    WitnessPubKeyHash,
    WitnessScriptHash,
    TapRoot
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BitcoinUtils {

    export function toSatoshi(amount: Decimal): Decimal {
        return amount.mul(new Decimal(1_0000_0000))
    }
}
