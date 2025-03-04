import {PrivateKey} from '../Secret/implementations/PrivateKey'
import {PublicKey} from '../PublicKey'
import {CurrencyInfo} from './CurrencyInfo'
import {ExtendedPublicKey} from '../Secret/ExtendedPublicKey'
import {ExtendedPrivateKey} from '../Secret/implementations/ExtendedPrivateKey'

export type CurrencyParams = {
    signMode: string;
}

export type PrivateKeySign = CurrencyParams & {
    signMode: 'privateKey';
    getPublicKey: () => Promise<PublicKey>;
    getPrivateKey: () => Promise<PrivateKey>;
};

export type HDPrivateKeySign = CurrencyParams & {
    signMode: 'hdPrivateKey';
    getDerivationPath: (currencyInfo: CurrencyInfo) => string,
    getPublicKey: (derivationPath: string) => Promise<ExtendedPublicKey>;
    getPrivateKey: (derivationPath: string) => Promise<ExtendedPrivateKey>;
};
