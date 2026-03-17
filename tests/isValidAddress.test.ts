import { describe, it, expect } from 'vitest';
import { ChainGate, isValidEvmAddress } from '../src';
import { getTestApiKey } from './helpers';

const cg = new ChainGate({ apiKey: getTestApiKey() });

// ---------------------------------------------------------------------------
// isValidEvmAddress (standalone helper)
// ---------------------------------------------------------------------------

describe('isValidEvmAddress', () => {
  it('accepts a valid checksummed address', () => {
    expect(isValidEvmAddress('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe(true);
  });

  it('accepts an all-lowercase address', () => {
    expect(isValidEvmAddress('0xab5801a7d398351b8be11c439e05c5b3259aec9b')).toBe(true);
  });

  it('accepts an all-uppercase address', () => {
    expect(isValidEvmAddress('0xAB5801A7D398351B8BE11C439E05C5B3259AEC9B')).toBe(true);
  });

  it('rejects an address with invalid EIP-55 checksum', () => {
    // Flip one character's case to break checksum.
    expect(isValidEvmAddress('0xAB5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe(false);
  });

  it('rejects an address that is too short', () => {
    expect(isValidEvmAddress('0xAb5801a7D398351b8bE11C439e05C5B3259ae')).toBe(false);
  });

  it('rejects an address that is too long', () => {
    expect(isValidEvmAddress('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B00')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEvmAddress('')).toBe(false);
  });

  it('rejects a Bitcoin address', () => {
    expect(isValidEvmAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidEvmAddress('0xGb5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe(false);
  });

  it('accepts an address without 0x prefix (all lowercase)', () => {
    expect(isValidEvmAddress('ab5801a7d398351b8be11c439e05c5b3259aec9b')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// EVM: EvmNetworkDescriptor.isValidAddress
// ---------------------------------------------------------------------------

describe('EvmNetworkDescriptor.isValidAddress', () => {
  const eth = cg.networks.ethereum;

  it('accepts a valid checksummed address', () => {
    expect(eth.isValidAddress('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe(true);
  });

  it('accepts an all-lowercase address', () => {
    expect(eth.isValidAddress('0xab5801a7d398351b8be11c439e05c5b3259aec9b')).toBe(true);
  });

  it('rejects an invalid checksum', () => {
    expect(eth.isValidAddress('0xAB5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe(false);
  });

  it('rejects a Bitcoin address', () => {
    expect(eth.isValidAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(eth.isValidAddress('')).toBe(false);
  });

  it('rejects gibberish', () => {
    expect(eth.isValidAddress('not-an-address')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EVM RPC: EvmRpcNetworkDescriptor.isValidAddress
// ---------------------------------------------------------------------------

describe('EvmRpcNetworkDescriptor.isValidAddress', () => {
  const bsc = cg.networks.evmRpc({
    rpcUrl: 'https://bsc-dataseed.binance.org',
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
  });

  it('accepts a valid checksummed address', () => {
    expect(bsc.isValidAddress('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe(true);
  });

  it('rejects an invalid address', () => {
    expect(bsc.isValidAddress('not-valid')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UTXO: Bitcoin
// ---------------------------------------------------------------------------

describe('UtxoNetworkDescriptor.isValidAddress (Bitcoin)', () => {
  const btc = cg.networks.bitcoin;

  it('accepts a P2PKH (legacy) address', () => {
    expect(btc.isValidAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(true);
  });

  it('accepts a P2SH address', () => {
    expect(btc.isValidAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true);
  });

  it('accepts a P2WPKH (segwit) address', () => {
    expect(btc.isValidAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(true);
  });

  it('accepts a P2WSH (segwit) address', () => {
    expect(
      btc.isValidAddress('bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej'),
    ).toBe(true);
  });

  it('accepts a P2TR (taproot) address', () => {
    expect(
      btc.isValidAddress('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297'),
    ).toBe(true);
  });

  it('rejects an invalid address', () => {
    expect(btc.isValidAddress('not-a-valid-address')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(btc.isValidAddress('')).toBe(false);
  });

  it('rejects an Ethereum address', () => {
    expect(btc.isValidAddress('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe(false);
  });

  it('rejects a Litecoin address', () => {
    expect(btc.isValidAddress('ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kgmn4n9')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UTXO: Litecoin
// ---------------------------------------------------------------------------

describe('UtxoNetworkDescriptor.isValidAddress (Litecoin)', () => {
  const ltc = cg.networks.litecoin;

  it('accepts a Litecoin P2PKH (legacy) address', () => {
    expect(ltc.isValidAddress('Lf48XedjbkDbjcUu8b58YgtF5jgpff6imo')).toBe(true);
  });

  it('accepts a Litecoin bech32 (segwit) address', () => {
    expect(ltc.isValidAddress('ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kgmn4n9')).toBe(true);
  });

  it('rejects a Bitcoin address', () => {
    expect(ltc.isValidAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UTXO: Dogecoin
// ---------------------------------------------------------------------------

describe('UtxoNetworkDescriptor.isValidAddress (Dogecoin)', () => {
  const doge = cg.networks.dogecoin;

  it('accepts a Dogecoin legacy address', () => {
    expect(doge.isValidAddress('DRapidDiBYggT1zdrELnVhNDqyAHn89cRi')).toBe(true);
  });

  it('rejects a Bitcoin address', () => {
    expect(doge.isValidAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BCH: Bitcoin Cash
// ---------------------------------------------------------------------------

describe('BchNetworkDescriptor.isValidAddress', () => {
  const bch = cg.networks.bitcoincash;

  it('accepts a CashAddr with prefix', () => {
    expect(bch.isValidAddress('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a')).toBe(true);
  });

  it('accepts a CashAddr without prefix', () => {
    expect(bch.isValidAddress('qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a')).toBe(true);
  });

  it('accepts a legacy P2PKH address', () => {
    expect(bch.isValidAddress('1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu')).toBe(true);
  });

  it('rejects an invalid address', () => {
    expect(bch.isValidAddress('not-valid')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(bch.isValidAddress('')).toBe(false);
  });

  it('rejects an Ethereum address', () => {
    expect(bch.isValidAddress('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UTXO: Bitcoin Testnet
// ---------------------------------------------------------------------------

describe('UtxoNetworkDescriptor.isValidAddress (Bitcoin Testnet)', () => {
  const tbtc = cg.networks.bitcointestnet;

  it('accepts a testnet P2WPKH address', () => {
    expect(tbtc.isValidAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx')).toBe(true);
  });

  it('accepts a testnet legacy address', () => {
    expect(tbtc.isValidAddress('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn')).toBe(true);
  });

  it('rejects a mainnet Bitcoin address', () => {
    expect(tbtc.isValidAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false);
  });
});
