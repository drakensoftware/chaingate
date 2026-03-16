import { describe, it, expect } from 'vitest';
import { ChainGate } from '../src';
import { getTestApiKey } from './helpers';

// ---------------------------------------------------------------------------
// identifyAddressType — tests against Bitcoin mainnet addresses
// ---------------------------------------------------------------------------

describe('UtxoNetworkDescriptor.identifyAddressType', () => {
  const cg = new ChainGate({ apiKey: getTestApiKey() });
  const btc = cg.networks.bitcoin;

  // Legacy P2PKH — addresses starting with '1'
  it('identifies a P2PKH (legacy) address', () => {
    expect(btc.identifyAddressType('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('legacy-p2pkh');
  });

  // Legacy P2SH — addresses starting with '3'
  it('identifies a P2SH (legacy) address', () => {
    expect(btc.identifyAddressType('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe('legacy-p2sh');
  });

  // SegWit P2WPKH — bech32 addresses starting with 'bc1q' (20-byte witness program)
  it('identifies a P2WPKH (segwit) address', () => {
    expect(btc.identifyAddressType('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(
      'segwit-p2wpkh',
    );
  });

  // SegWit P2WSH — bech32 addresses starting with 'bc1q' (32-byte witness program)
  it('identifies a P2WSH (segwit) address', () => {
    expect(
      btc.identifyAddressType('bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej'),
    ).toBe('segwit-p2wsh');
  });

  // Taproot P2TR — bech32m addresses starting with 'bc1p'
  it('identifies a P2TR (taproot) address', () => {
    expect(
      btc.identifyAddressType('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297'),
    ).toBe('taproot-p2tr');
  });

  // Unknown / invalid addresses
  it('returns unknown for an invalid address', () => {
    expect(btc.identifyAddressType('not-a-valid-address')).toBe('unknown');
  });

  it('returns unknown for an empty string', () => {
    expect(btc.identifyAddressType('')).toBe('unknown');
  });

  it('returns unknown for an Ethereum address', () => {
    expect(btc.identifyAddressType('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B')).toBe('unknown');
  });

  // Litecoin address should be unknown for Bitcoin network params
  it('returns unknown for a Litecoin address on Bitcoin network', () => {
    expect(btc.identifyAddressType('ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kgmn4n9')).toBe('unknown');
  });
});

describe('UtxoNetworkDescriptor.identifyAddressType (Litecoin)', () => {
  const cg = new ChainGate({ apiKey: getTestApiKey() });
  const ltc = cg.networks.litecoin;

  it('identifies a Litecoin P2PKH (legacy) address starting with L', () => {
    // Litecoin legacy addresses start with 'L' (pubKeyHash 0x30)
    expect(ltc.identifyAddressType('Lf48XedjbkDbjcUu8b58YgtF5jgpff6imo')).toBe('legacy-p2pkh');
  });

  it('identifies a Litecoin bech32 (segwit) address', () => {
    expect(ltc.identifyAddressType('ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kgmn4n9')).toBe(
      'segwit-p2wpkh',
    );
  });
});
