import { describe, it, expect } from 'vitest';
import { XprivWallet, Xpriv, PrivateKey, DerivedKey } from '../src';
import {
  MASTER_XPRIV,
  DERIVATION_PATH,
  PRIV_HEX,
  PUB_HEX,
  EXPECTED_XPRIV,
  EXPECTED_XPUB,
} from './fixtures';

describe('XprivWallet', () => {
  const wallet = new XprivWallet(new Xpriv(MASTER_XPRIV));

  it('serialize returns json with type and xpriv', async () => {
    const serialized = await wallet.serialize({ acknowledge: true });
    expect(serialized).toMatchObject({ type: 'xpriv', xpriv: MASTER_XPRIV });
    expect(serialized).toHaveProperty('derivationIndex');
    expect(serialized).toHaveProperty('masterPublicKey');
  });

  it('derive returns a DerivedKey', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived).toBeInstanceOf(DerivedKey);
  });

  it('derive gives correct private key', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.privateKey).toBeInstanceOf(PrivateKey);
    expect(derived.privateKey.hex).toBe(PRIV_HEX);
  });

  it('derive gives correct public key', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.publicKeyHex).toBe(PUB_HEX);
  });

  it('derive gives correct xpriv and xpub', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.xpriv).toBe(EXPECTED_XPRIV);
    expect(derived.xpub).toBe(EXPECTED_XPUB);
  });

  it('derives same keys as SeedWallet from same mnemonic', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.privateKey.hex).toBe(PRIV_HEX);
  });
});
