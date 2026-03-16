// Abstract
export { Wallet } from './Wallet/Wallet';
export { Secret } from './Wallet/Secret';
export { SigningWallet } from './Wallet/SigningWallet/SigningWallet';
export { HDWallet } from './Wallet/SigningWallet/HDWallet/HDWallet';
export { ViewOnlyWallet } from './Wallet/ViewOnlyWallet/ViewOnlyWallet';

// Entities
export { Phrase } from './Wallet/SigningWallet/HDWallet/PhraseWallet/Phrase';
export { Seed } from './Wallet/SigningWallet/HDWallet/SeedWallet/Seed';
export { Xpriv } from './Wallet/SigningWallet/HDWallet/XprivWallet/Xpriv';
export { PrivateKey } from './Wallet/SigningWallet/PrivateKeyWallet/PrivateKey';
export { PublicKey } from './Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKey';
export { DerivedKey } from './Wallet/DerivedKey';
export type { DerivedKeyData } from './Wallet/DerivedKey';
export { DerivedPublicKey } from './Wallet/DerivedPublicKey';
export type { DerivedPublicKeyData } from './Wallet/DerivedPublicKey';

// Wallet implementations
export { PhraseWallet } from './Wallet/SigningWallet/HDWallet/PhraseWallet/PhraseWallet';
export { SeedWallet } from './Wallet/SigningWallet/HDWallet/SeedWallet/SeedWallet';
export { XprivWallet } from './Wallet/SigningWallet/HDWallet/XprivWallet/XprivWallet';
export { PrivateKeyWallet } from './Wallet/SigningWallet/PrivateKeyWallet/PrivateKeyWallet';
export { XpubWallet } from './Wallet/ViewOnlyWallet/XpubWallet/XpubWallet';
export { PublicKeyWallet } from './Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKeyWallet';

// Type guards
export { supports } from './supports';

// Factory
export {
  detectWalletImportType,
  newWallet,
  importWallet,
  isValidSerialized,
  deserializeWallet,
  createWalletFromString,
  importFromKeystore,
  isValidKeystore,
  isValidPhrase,
  isValidSeed,
  isValidPrivateKey,
} from './WalletFactory';

// Errors
export {
  InvalidPhraseError,
  InvalidPrivateKeyError,
  InvalidSeedError,
  InvalidPublicKeyError,
  DecryptionCancelledError,
  NotEncryptedError,
  AlreadyEncryptedError,
  EncryptedAccessError,
  HDKeyNullError,
} from './Wallet/errors';
export {
  InvalidHexError,
  UnrecognizedFormatError,
  InvalidWalletParamsError,
  InvalidWalletExportError,
  UnsupportedOperationError,
  BroadcastError,
  TransactionAlreadySentError,
  NotEnoughFundsError,
  RateLimitError,
  RateLimitQuotaError,
  RpcError,
  IncorrectKeystorePasswordError,
  InvalidKeystoreError,
} from './errors';

// Constants
export { commonDerivationPaths } from './constants';

// Types
export type {
  WalletSerialized,
  WalletType,
  SecretWalletType,
  PhraseWalletSerialized,
  SeedWalletSerialized,
  XprivWalletSerialized,
  PrivateKeyWalletSerialized,
  XpubWalletSerialized,
  PublicKeyWalletSerialized,
} from './Wallet/WalletSerialized';
export { WALLET_TYPES, SECRET_WALLET_TYPES } from './Wallet/WalletSerialized';
export type { EncryptedState } from './Wallet/Secret';
export type { SerializeOptions } from './Wallet/SigningWallet/SigningWallet';
export type {
  DerivationIndexEntry,
  HDKeySource,
  HDWalletRestoreData,
} from './Wallet/SigningWallet/HDWallet/HDWallet';
export type {
  PhraseLanguage,
  PhraseNumOfWords,
} from './Wallet/SigningWallet/HDWallet/PhraseWallet/Phrase';
export type { InputType, WalletParams, AnyWallet } from './WalletFactory';

export { ChainGate } from './ChainGate/ChainGate';
export type { ChainGateGlobal } from './ChainGate/ChainGate';
export { RpcUrls } from './ChainGate/RpcUrls';
export type { RpcNetwork } from './ChainGate/RpcUrls';
export {
  NetworkDescriptor,
  UtxoNetworkDescriptor,
  BchNetworkDescriptor,
  EvmNetworkDescriptor,
  EvmRpcNetworkDescriptor,
} from './ChainGate/networks';
export type {
  Network,
  NetworkInfo,
  NetworkCollection,
  EvmRpcConfig,
  AddressType,
  UtxoAddressType,
  BchAddressType,
  EvmAddressType,
  AddressTypeConfig,
  DetailedUtxoAddressType,
} from './ChainGate/networks';

// Explorer
export { UtxoExplorer } from './Explorer/UtxoExplorer';
export type { UtxoNetwork } from './Explorer/UtxoExplorer';
export { EvmExplorer } from './Explorer/EvmExplorer';
export type { EvmNetwork } from './Explorer/EvmExplorer';
export { GlobalExplorer } from './Explorer/GlobalExplorer';
export type { GlobalLogoNetwork } from './Explorer/GlobalExplorer';
export { EvmRpcExplorer } from './Connector/EvmRpcConnector/EvmRpcExplorer';
export type { RpcFeeData, RpcTransactionReceipt } from './Connector/EvmRpcConnector/EvmRpcExplorer';

// Connector
export { Connector } from './Connector/Connector';
export type { AddressOptions } from './Connector/Connector';
export { EvmConnector } from './Connector/EvmConnector/EvmConnector';
export { EvmTransaction } from './Connector/EvmConnector/EvmTransaction';
export type {
  EvmFeeTier,
  EvmFee,
  EvmRecommendedFee,
  EvmRecommendedFees,
} from './Connector/EvmConnector/EvmTransaction';
export { BroadcastedEvmTransaction } from './Connector/EvmConnector/BroadcastedEvmTransaction';
export type { EvmConfirmationDetails } from './Connector/EvmConnector/BroadcastedEvmTransaction';
export { EvmRpcConnector } from './Connector/EvmRpcConnector/EvmRpcConnector';
export { EvmRpcTransaction } from './Connector/EvmRpcConnector/EvmRpcTransaction';
export type { EvmRpcFee } from './Connector/EvmRpcConnector/EvmRpcTransaction';
export { BroadcastedEvmRpcTransaction } from './Connector/EvmRpcConnector/BroadcastedEvmRpcTransaction';
export type { EvmRpcConfirmationDetails } from './Connector/EvmRpcConnector/BroadcastedEvmRpcTransaction';
export { UtxoConnector } from './Connector/UtxoConnector/UtxoConnector';
export type { UtxoAddressOptions } from './Connector/UtxoConnector/UtxoConnector';
export { UtxoTransaction } from './Connector/UtxoConnector/UtxoTransaction';
export { BaseUtxoTransaction } from './Connector/UtxoConnector/BaseUtxoTransaction';
export type {
  UtxoFee,
  UtxoFeeTier,
  UtxoRecommendedFee,
  UtxoRecommendedFees,
  Txo,
  UtxoApiState,
} from './Connector/UtxoConnector/BaseUtxoTransaction';
export { BroadcastedUtxoTransaction } from './Connector/UtxoConnector/BroadcastedUtxoTransaction';
export type { UtxoConfirmationDetails } from './Connector/UtxoConnector/BroadcastedUtxoTransaction';
export { BchConnector } from './Connector/UtxoConnector/BchConnector';
export type { BchAddressOptions } from './Connector/UtxoConnector/BchConnector';
export { BchTransaction } from './Connector/UtxoConnector/BchTransaction';
export type {
  BchFee,
  BchFeeTier,
  BchRecommendedFee,
  BchRecommendedFees,
} from './Connector/UtxoConnector/BchTransaction';

// UTXO Cache
export { UtxoLocalCache } from './utils/UtxoLocalCache';
export type { CachedUtxo } from './utils/UtxoLocalCache';

// Utils
export { Amount } from './utils/Amount';
export type { AmountData, BaseValue, DecimalLike, OwnedNft, FiatCurrency } from './utils/Amount';
export { publicKeyToEthAddress } from './utils/crypto';
export {
  encodeErc20Transfer,
  encodeErc721SafeTransferFrom,
  encodeErc1155SafeTransferFrom,
} from './utils/abiEncode';
export {
  signEvmMessage,
  verifyEvmMessage,
  signUtxoMessage,
  recoverUtxoPublicKey,
} from './utils/messageSigning';

// Keystore
export { Keystore } from './Keystore/Keystore';
export { LegacyKeystore } from './Keystore/LegacyKeystore';
export type { LegacyKeystoreData } from './Keystore/LegacyKeystore';
export { Web3Keystore } from './Keystore/Web3Keystore';
export type { Web3KeystoreData } from './Keystore/Web3Keystore';
