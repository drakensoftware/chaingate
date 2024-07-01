import {Currency, CurrencyAmount, NotEnoughFundsError, PossibleFees} from '../Currency'
import {ethers} from 'ethers'
import {Utils} from '../../../Utils'
import Decimal from 'decimal.js'
import {PreparedEvmTransaction} from './PreparedEvmTransaction'
import {ConsumeFunction} from '../../../CGDriver'
import {EvmApi} from 'chaingate-client'
import {PrivateKeySource} from '../../Keys'
import {EvmFee} from './EvmFee'

export type EvmCurrencyInfo = {
    symbol: string,
    id: string,
    name: string,
    svgLogoUrl: string,
    chainId: number,
    decimals: number
}

export abstract class Evm extends Currency {
    declare readonly api: EvmApi
    readonly chainId: number


    protected constructor(evmCurrencyInfo: EvmCurrencyInfo, api: EvmApi, privateKeySource: PrivateKeySource) {
        super({
            symbol: evmCurrencyInfo.symbol,
            id: evmCurrencyInfo.id,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            name: evmCurrencyInfo.name,
            svgLogoUrl: evmCurrencyInfo.svgLogoUrl,
            decimals: evmCurrencyInfo.decimals,
            minimalUnitSymbol: 'wei'
        }, api, privateKeySource)
        this.chainId = evmCurrencyInfo.chainId
    }

    async getAddress(): Promise<string> {
        const publicKeyBytes = this.publicKey.compressed
        return ethers.computeAddress(Utils.bytesToHex(publicKeyBytes, true))
    }

    async getBalance(address?: string): Promise<{ confirmed: CurrencyAmount; unconfirmed: CurrencyAmount }> {
        if (!address) address = await this.getAddress()
        const balance = await ConsumeFunction(
            this.api,
            this.api.addressBalance,
            address)
        return {confirmed: new CurrencyAmount(this, new Decimal(balance.confirmed)), unconfirmed: new CurrencyAmount(this, new Decimal(balance.unconfirmed))}
    }

    async prepareTransfer(toAddress: string, amount: CurrencyAmount): Promise<PreparedEvmTransaction> {
        return this.prepareSmartContractTransaction(toAddress, amount, null)
    }

    async prepareSmartContractTransaction(smartContractAddress: string, amount: CurrencyAmount, data: string): Promise<PreparedEvmTransaction> {
        const balance = await this.getBalance()
        if(balance.confirmed.baseAmount.lt(amount.baseAmount)) throw new NotEnoughFundsError(this, new CurrencyAmount(this, amount.baseAmount.minus(balance.confirmed.baseAmount)))

        return new PreparedEvmTransaction( this.api,
            this,
            await this.getAddress(),
            smartContractAddress,
            amount,
            await this.buildPossibleFees(),
            this.chainId,
            data)
    }

    async callSmartContractFunction(smartContractAddress: string, data: string) {
        const result = await ConsumeFunction(this.api, this.api.callSmartContractFunction,
            {contract: smartContractAddress, data})
        return result.result
    }

    private async buildPossibleFees(): Promise<PossibleFees<EvmFee>> {
        const feeRateResponse = await ConsumeFunction(this.api, this.api.feeRate)
        return {
            low: EvmFee.feeAmount(
                new CurrencyAmount(this, new Decimal(feeRateResponse['low'].maxFeePerGas)),
                new  CurrencyAmount(this, new Decimal(feeRateResponse['low'].maxPriorityFeePerGas))
            ),
            normal: EvmFee.feeAmount(
                new  CurrencyAmount(this, new Decimal(feeRateResponse['normal'].maxFeePerGas)),
                new  CurrencyAmount(this, new Decimal(feeRateResponse['normal'].maxPriorityFeePerGas))
            ),
            high: EvmFee.feeAmount(
                new  CurrencyAmount(this, new Decimal(feeRateResponse['high'].maxFeePerGas)),
                new  CurrencyAmount(this, new Decimal(feeRateResponse['high'].maxPriorityFeePerGas))
            ),
            maximum: EvmFee.feeAmount(
                new  CurrencyAmount(this, new Decimal(feeRateResponse['maximum'].maxFeePerGas)),
                new  CurrencyAmount(this, new Decimal(feeRateResponse['maximum'].maxPriorityFeePerGas))
            )
        }
    }

    fee(fee: { maxFeePerGas: CurrencyAmount, maxPriorityFeePerGas: CurrencyAmount }): EvmFee {
        return EvmFee.feeAmount(fee.maxFeePerGas, fee.maxPriorityFeePerGas)
    }
}
