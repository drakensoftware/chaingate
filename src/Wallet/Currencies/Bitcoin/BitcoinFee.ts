import {CurrencyAmount} from "../Currency";

export enum FeeKind {
    FeeAmount,
    FeePerByte
}

export class BitcoinFee{
    public readonly fee: CurrencyAmount
    public readonly kind: FeeKind

    private constructor(fee: CurrencyAmount, feeKind: FeeKind){
        this.fee = fee
        this.kind = feeKind
    }

    public static feePerByte(feePerByte: CurrencyAmount): BitcoinFee{
        return new BitcoinFee(feePerByte, FeeKind.FeePerByte)
    }

    public static feeAmount(fee: CurrencyAmount): BitcoinFee{
        return new BitcoinFee(fee, FeeKind.FeeAmount)
    }

}
