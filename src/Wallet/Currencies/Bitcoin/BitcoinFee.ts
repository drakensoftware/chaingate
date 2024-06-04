import BitcoinCurrencyAmount from './BitcoinCurrencyAmount'

export enum FeeKind {
    FeeAmount,
    FeePerByte
}

export class BitcoinFee{
    public readonly fee: BitcoinCurrencyAmount
    public readonly kind: FeeKind

    private constructor(fee: BitcoinCurrencyAmount, feeKind: FeeKind){
        this.fee = fee
        this.kind = feeKind
    }

    public static feePerByte(feePerByte: BitcoinCurrencyAmount): BitcoinFee{
        return new BitcoinFee(feePerByte, FeeKind.FeePerByte)
    }

    public static feeAmount(fee: BitcoinCurrencyAmount): BitcoinFee{
        return new BitcoinFee(fee, FeeKind.FeeAmount)
    }

}
