import { ethers, SigningKey } from 'ethers'
import { bytesToHex } from '../../../../InternalUtils/Utils'
import { Address } from '../../../../Wallet/entities/Address'
import { Transports } from '../../Transports'
import { EvmTransaction } from './EvmTransaction'
import { CurrencyWallet } from '../../CurrencyWallet'
import { EvmCurrencyInfo } from '../../../CurrencyInfo'
import { EvmCurrencyUtils } from '../../../CurrencyUtils/abstract/EvmCurrencyUtils'
import { CurrencyAmount } from '../../../CurrencyUtils'

export class EvmWallet<CI extends EvmCurrencyInfo> extends CurrencyWallet<CI> {
    declare utils: EvmCurrencyUtils<CI>

    constructor(utils: EvmCurrencyUtils<CI>, transports: Transports) {
        super(utils, transports)
    }

    async getAddress(): Promise<string> {
        const publicKey = await (
            await this.transports.getPublicKeyProvider(this.utils.currencyInfo.id)
        )()
        return ethers.computeAddress(bytesToHex(publicKey.raw, true))
    }

    async getBalance(): Promise<{
        confirmed: CurrencyAmount<CI>
        unconfirmed: CurrencyAmount<CI>
    }> {
        return this.utils.addressBalance(await this.getAddress())
    }

    async createTransfer(
        toAddress: Address,
        amount: CurrencyAmount<CI>,
    ): Promise<EvmTransaction<CI>> {
        return this.prepareSmartContractTransaction(toAddress, amount, null)
    }

    async prepareSmartContractTransaction(
        smartContractAddress: Address,
        amount: CurrencyAmount<CI>,
        data: string,
    ): Promise<EvmTransaction<CI>> {
        const privateKeyProvider = await this.transports.getPrivateKeyProvider(
            this.utils.currencyInfo.id,
        )

        return new EvmTransaction(
            this.utils,
            await this.getAddress(),
            smartContractAddress,
            amount,
            data,
            privateKeyProvider,
        )
    }

    async signMessage(message: string): Promise<string> {
        const signer = new ethers.Wallet(new SigningKey((await this.getPrivateKey()).raw))
        return await signer.signMessage(message)
    }
}
