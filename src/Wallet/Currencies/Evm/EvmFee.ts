import {CurrencyAmount} from "../Currency";

export class EvmFee {
    maxFeePerGas: CurrencyAmount
    maxPriorityFeePerGas: CurrencyAmount

    private constructor(maxFeePerGas: CurrencyAmount, maxPriorityFeePerGas: CurrencyAmount) {
        this.maxFeePerGas = maxFeePerGas
        this.maxPriorityFeePerGas = maxPriorityFeePerGas
    }

    public static feeAmount(mexFeePerGas: CurrencyAmount, maxPriorityFeePerGas: CurrencyAmount): EvmFee{
        return new EvmFee(mexFeePerGas, maxPriorityFeePerGas)
    }
}
