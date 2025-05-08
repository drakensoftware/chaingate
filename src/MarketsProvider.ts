import {ChainGateClient} from 'chaingate-client'

export const FiatCurrencies = [
    'aed', 'afn', 'all', 'amd', 'ang', 'aoa', 'ars', 'aud', 'awg', 'azn', 'bam', 'bbd',
    'bdt', 'bgn', 'bhd', 'bif', 'bmd', 'bnd', 'bob', 'brl', 'bsd', 'btn', 'bwp', 'byn',
    'byr', 'bzd', 'cad', 'cdf', 'chf', 'clf', 'clp', 'cny', 'cnh', 'cop', 'crc', 'cuc',
    'cup', 'cve', 'czk', 'djf', 'dkk', 'dop', 'dzd', 'egp', 'ern', 'etb', 'eur', 'fjd',
    'fkp', 'gbp', 'gel', 'ggp', 'ghs', 'gip', 'gmd', 'gnf', 'gtq', 'gyd', 'hkd', 'hnl',
    'hrk', 'htg', 'huf', 'idr', 'ils', 'imp', 'inr', 'iqd', 'irr', 'isk', 'jep', 'jmd',
    'jod', 'jpy', 'kes', 'kgs', 'khr', 'kmf', 'kpw', 'krw', 'kwd', 'kyd', 'kzt', 'lak',
    'lbp', 'lkr', 'lrd', 'lsl', 'ltl', 'lvl', 'lyd', 'mad', 'mdl', 'mga', 'mkd', 'mmk',
    'mnt', 'mop', 'mru', 'mur', 'mvr', 'mwk', 'mxn', 'myr', 'mzn', 'nad', 'ngn', 'nio',
    'nok', 'npr', 'nzd', 'omr', 'pab', 'pen', 'pgk', 'php', 'pkr', 'pln', 'pyg', 'qar',
    'ron', 'rsd', 'rub', 'rwf', 'sar', 'sbd', 'scr', 'sdg', 'sek', 'sgd', 'shp', 'sle',
    'sll', 'sos', 'srd', 'std', 'svc', 'syp', 'szl', 'thb', 'tjs', 'tmt', 'tnd', 'top',
    'try', 'ttd', 'twd', 'tzs', 'uah', 'ugx', 'usd', 'uyu', 'uzs', 'ves', 'vnd', 'vuv',
    'wst', 'xaf', 'xcd', 'xof', 'xpf', 'yer', 'zar', 'zmk', 'zmw', 'zwl'] as const

export interface MarketsResponse {
    fiat: Array<{
        rateUsd: string;
        symbol: string;
    }>;
    crypto: Array<{
        vol24h: string;
        rateUsd: string;
        id: string;
    }>;
}

export class MarketsProvider {
    private static marketData: MarketsResponse
    private static latestQuery = 0

    public static async getMarketData(client: ChainGateClient) {
        const THIRTY_SECONDS = 30 * 1000
        if (!MarketsProvider.latestQuery || (Date.now() - MarketsProvider.latestQuery) > THIRTY_SECONDS) {
            MarketsProvider.marketData = (await client.GlobalApi.markets()).data
            MarketsProvider.latestQuery = Date.now()
        }
        return this.marketData
    }
}
