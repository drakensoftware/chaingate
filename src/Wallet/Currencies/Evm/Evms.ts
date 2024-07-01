import {Evm} from './Evm'
import {PrivateKeySource} from '../../Keys'
import {ArbitrumApi, EthereumApi, PolygonApi} from 'chaingate-client'
import {Utils} from '../../../Utils'

export class Arbitrum extends Evm {
    constructor(api: ArbitrumApi, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'ARB',
            id: 'arbitrum',
            name: 'Arbitrum One',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/arbitrum/logo'),
            chainId: 0xa4b1,
            decimals: 18
        }, api, privateKeySource)
    }
}

export class Avalanche extends Evm {
    constructor(api: ArbitrumApi, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'AVAX',
            id: 'avalanche',
            name: 'Avalanche C-Chain',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/avalanche/logo'),
            chainId: 0xa86a,
            decimals: 18
        }, api, privateKeySource)
    }
}

export class BinanceSmartChain extends Evm {
    constructor(api: ArbitrumApi, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'BSC',
            id: 'binanceSmartChain',
            name: 'Binance Smart Chain',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/binance/logo'),
            chainId: 0x38,
            decimals: 18
        }, api, privateKeySource)
    }
}

export class Boba extends Evm {
    constructor(api: ArbitrumApi, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'BOBA',
            id: 'boba',
            name: 'Boba Network',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/boba/logo'),
            chainId: 0x120,
            decimals: 18
        }, api, privateKeySource)
    }
}

export class Ethereum extends Evm {
    constructor(api: EthereumApi, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'ETH',
            id: 'ethereum',
            name: 'Ethereum',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/ethereum/logo'),
            chainId: 0x01,
            decimals: 18
        }, api, privateKeySource)
    }
}

export class FantomOpera extends Evm {
    constructor(api: EthereumApi, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'FTM',
            id: 'fantom',
            name: 'Fantom Opera',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/fantom/logo'),
            chainId: 0xfa,
            decimals: 18
        }, api, privateKeySource)
    }
}

export class Polygon extends Evm {
    constructor(api: PolygonApi, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'MATIC',
            id: 'polygon',
            name: 'Polygon',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/polygon/logo'),
            chainId: 0x89,
            decimals: 18
        }, api, privateKeySource)
    }
}
