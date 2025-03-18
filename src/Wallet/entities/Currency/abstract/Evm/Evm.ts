import {EvmApi} from 'chaingate-client'
import {ethers} from 'ethers'
import {bytesToHex} from '../../../../../Utils/Utils'
import Decimal from 'decimal.js'
import {ConsumeFunction} from '../../../../../CGDriver'
import { Address } from '../../../Address'
import {EvmCurrencyInfo} from './EvmCurrencyInfo'
import {CurrencyProviders} from '../../CurrencyProviders'
import {CurrencyAmount} from '../../CurrencyAmount'
import {EvmPreparedTransaction} from './EvmPreparedTransaction'
import {CannotParseAmount} from '../../errors'
import {Currency} from '../../Currency'

export abstract class Evm<DefaultUnitSpecifier extends string> extends Currency {
    declare protected readonly api: EvmApi
    declare readonly currencyInfo: EvmCurrencyInfo
    declare currencyProviders: CurrencyProviders

    protected constructor(currencyInfo: EvmCurrencyInfo, api: EvmApi, currencyProviders: CurrencyProviders) {
        super(currencyInfo, api, currencyProviders)
        this.currencyInfo = currencyInfo
    }

    async getAddress(): Promise<string> {
        const publicKey = await (await this.currencyProviders.getPublicKeyProvider(this.currencyInfo))()
        return ethers.computeAddress(bytesToHex(publicKey.raw, true))
    }

    async getBalance(address?: string): Promise<{ confirmed: CurrencyAmount; unconfirmed: CurrencyAmount }> {
        if (!address) address = await this.getAddress()
        const balance = await ConsumeFunction(
            this.api,
            this.api.addressBalance,
            address)
        return {confirmed: new CurrencyAmount(this.currencyInfo, new Decimal(balance.confirmed)), unconfirmed: new CurrencyAmount(this.currencyInfo, new Decimal(balance.unconfirmed))}
    }

    async createTransfer(toAddress: Address, amount: CurrencyAmount): Promise<EvmPreparedTransaction> {
        return this.prepareSmartContractTransaction(toAddress, amount, null)
    }

    async prepareSmartContractTransaction(smartContractAddress: Address, amount: CurrencyAmount, data: string): Promise<EvmPreparedTransaction> {

        const privateKeyProvider = await this.currencyProviders.getPrivateKeyProvider(this.currencyInfo)

        return new EvmPreparedTransaction(
            this.api,
            this.currencyProviders,
            this.currencyInfo,
            await this.getAddress(),
            smartContractAddress,
            amount,
            data,
            privateKeyProvider
        )
    }

    async callSmartContractRaw(smartContractAddress: Address, data: string) {
        const result = await ConsumeFunction(this.api, this.api.callSmartContractFunction,
            {contract: smartContractAddress, data})
        return result.result
    }

    async amount(amountStr: string, unit: DefaultUnitSpecifier | 'wei'): Promise<CurrencyAmount>{
        try{
            switch (unit){
            case 'wei': return new CurrencyAmount(
                this.currencyInfo,
                new Decimal(amountStr).div('1_000_000_000_000_000_000')
            )
            default: return new CurrencyAmount(
                this.currencyInfo,
                new Decimal(amountStr)
            )
            }
        } catch (_ex) { throw new CannotParseAmount(amountStr) }
    }

    async networkStatus() {
        return await ConsumeFunction(this.api, this.api.networkStatus)
    }
}
