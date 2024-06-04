import EthereumCurrencyAmount from './EthereumCurrencyAmount'

export class EthereumFee{
    maxFeePerGas: EthereumCurrencyAmount
    maxPriorityFeePerGas: EthereumCurrencyAmount

    private constructor(maxFeePerGas: EthereumCurrencyAmount, maxPriorityFeePerGas: EthereumCurrencyAmount) {
        this.maxFeePerGas = maxFeePerGas
        this.maxPriorityFeePerGas = maxPriorityFeePerGas
    }

    public static feeAmount(mexFeePerGas: EthereumCurrencyAmount, maxPriorityFeePerGas: EthereumCurrencyAmount): EthereumFee{
        return new EthereumFee(mexFeePerGas, maxPriorityFeePerGas)
    }
}
