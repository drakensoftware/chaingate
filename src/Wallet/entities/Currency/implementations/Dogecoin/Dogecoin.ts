import {BitcoinCashApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../../Utils/Utils'
import * as btc from '@scure/btc-signer'
import {LegacyUtxo} from '../../abstract/LegacyUtxo/LegacyUtxo'
import {HDPrivateKeySign, PrivateKeySign} from '../../CurrencyParams'

export class Dogecoin extends LegacyUtxo<'doge'> {
    declare currencyParams: PrivateKeySign | HDPrivateKeySign

    constructor(api: BitcoinCashApi,  currencyParams: PrivateKeySign | HDPrivateKeySign) {
        super({
            symbol: 'DOGE',
            id: 'dogecoin',
            name: 'Dogecoin',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/dogecoin/logo'),
            decimals: 8,
            defaultDerivationPath: 'm/44\'/3\'/0\'/0/0',
            minimalUnitSymbol: 'satoshi',
            commonDerivationPaths: ['m/44\'/3\'/0\'/0/0', 'm/84\'/3\'/0\'/0/0', 'm/86\'/3\'/0\'/0/0']
        },
        api,
        currencyParams,
        {
            bech32: null,
            pubKeyHash: 0x1E,
            scriptHash: 0x16,
            wif: 0x9E
        })
    }

    async getAddress(): Promise<string> {

        let publicKey
        if(this.currencyParams.signMode == 'privateKey') publicKey = await this.currencyParams.getPublicKey()
        else publicKey = await this.currencyParams.getPublicKey(this.currencyParams.getDerivationPath(this.currencyInfo))

        const publicKeyRaw = publicKey.raw

        return btc.p2pkh(publicKeyRaw, this.networkParams).address
    }
}
