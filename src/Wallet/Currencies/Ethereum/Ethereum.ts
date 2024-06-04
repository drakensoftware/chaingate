import {Currency, NotEnoughFundsError, PossibleFees} from '../Currency'
import {ethers} from 'ethers'
import {Utils} from '../../../Utils'
import Decimal from 'decimal.js'
import {PreparedEthereumTransaction} from './PreparedEthereumTransaction'
import {EthereumFee} from './EthereumFee'
import EthereumCurrencyAmount from './EthereumCurrencyAmount'
import {ConsumeFunction} from '../../../CGDriver'
import {ChainGateClient} from 'chaingate-client'
import {PrivateKeySource} from '../../Keys'

export class Ethereum extends Currency {

    static CurrencyInfo = {
        symbol: 'ETH',
        id: 'ethereum',
        defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
        name: 'ethereum',
        svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/ethereum/logo')
    }

    constructor(chainGateClient: ChainGateClient, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'ETH',
            id: 'ethereum',
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            name: 'ethereum',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/ethereum/logo')
        }, chainGateClient, privateKeySource)
    }

    async getAddress(): Promise<string> {
        const publicKeyBytes = this.publicKey.compressed
        return ethers.computeAddress(Utils.bytesToHex(publicKeyBytes, true))
    }

    async getBalance(address?: string): Promise<{ confirmed: EthereumCurrencyAmount; unconfirmed: EthereumCurrencyAmount }> {
        if (!address) address = await this.getAddress()
        const balance = await ConsumeFunction(
            this.chaingateClient.Ethereum,
            this.chaingateClient.Ethereum.addressBalance,
            address)
        return {confirmed: new EthereumCurrencyAmount(new Decimal(balance.confirmed)), unconfirmed: new EthereumCurrencyAmount(new Decimal(balance.unconfirmed))}
    }

    async prepareTransfer(toAddress: string, amount: EthereumCurrencyAmount): Promise<PreparedEthereumTransaction> {
        const balance = await this.getBalance()
        if(balance.confirmed.eth.lt(amount.eth)) throw new NotEnoughFundsError(this, new EthereumCurrencyAmount(amount.eth.minus(balance.confirmed.eth)))
        return this.prepareSmartContractTransaction(toAddress, amount, null)
    }

    async prepareSmartContractTransaction(smartContractAddress: string, amount: EthereumCurrencyAmount, data: string): Promise<PreparedEthereumTransaction> {
        return new PreparedEthereumTransaction( this.chaingateClient,
            this,
            await this.getAddress(),
            smartContractAddress,
            amount,
            await this.buildPossibleFees(),
            data)
    }

    async callSmartContractFunction(smartContractAddress: string, data: string) {
        const result = await ConsumeFunction(this.chaingateClient.Ethereum, this.chaingateClient.Ethereum.callSmartContractFunction,
            {contract: smartContractAddress, data})
        return result.result
    }

    private async buildPossibleFees(): Promise<PossibleFees<EthereumFee>> {
        const feeRateResponse = await ConsumeFunction(this.chaingateClient.Ethereum, this.chaingateClient.Ethereum.feeRate)
        return {
            low: EthereumFee.feeAmount(
                new EthereumCurrencyAmount(new Decimal(feeRateResponse['low'].maxFeePerGas)),
                new EthereumCurrencyAmount(new Decimal(feeRateResponse['low'].maxPriorityFeePerGas))
            ),
            normal: EthereumFee.feeAmount(
                new EthereumCurrencyAmount(new Decimal(feeRateResponse['normal'].maxFeePerGas)),
                new EthereumCurrencyAmount(new Decimal(feeRateResponse['normal'].maxPriorityFeePerGas))
            ),
            high: EthereumFee.feeAmount(
                new EthereumCurrencyAmount(new Decimal(feeRateResponse['high'].maxFeePerGas)),
                new EthereumCurrencyAmount(new Decimal(feeRateResponse['high'].maxPriorityFeePerGas))
            ),
            maximum: EthereumFee.feeAmount(
                new EthereumCurrencyAmount(new Decimal(feeRateResponse['maximum'].maxFeePerGas)),
                new EthereumCurrencyAmount(new Decimal(feeRateResponse['maximum'].maxPriorityFeePerGas))
            )
        }
    }
}
