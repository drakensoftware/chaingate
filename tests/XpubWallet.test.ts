import { describe, it, expect } from 'vitest';
import { XpubWallet, XprivWallet, Xpriv, DerivedPublicKey } from '../src';
import { BIP32_MASTER_XPUB, BIP32_MASTER_XPRIV } from './fixtures';

// Non-hardened derivation path
const DERIVATION_PATH = 'm/0/0';

describe('XpubWallet', () => {
  const wallet = new XpubWallet(BIP32_MASTER_XPUB);

  it('serialize returns json with type and xpub', async () => {
    expect(await wallet.serialize()).toEqual({ type: 'xpub', xpub: BIP32_MASTER_XPUB });
  });

  it('serialize does not require acknowledge option', async () => {
    const serialized = await wallet.serialize();
    expect(serialized.type).toBe('xpub');
  });

  it('derive returns a DerivedPublicKey', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived).toBeInstanceOf(DerivedPublicKey);
  });

  it('derive gives a public key', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.publicKey).toBeInstanceOf(Uint8Array);
    expect(derived.publicKey.length).toBe(33);
  });

  it('derive gives publicKeyHex as string', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(typeof derived.publicKeyHex).toBe('string');
    expect(derived.publicKeyHex.length).toBe(66);
  });

  it('derive gives xpub for derived path', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.xpub).toMatch(/^xpub/);
    expect(derived.xpub).not.toBe(BIP32_MASTER_XPUB);
  });

  it('derive with empty path returns master key', async () => {
    const derived = await wallet.derive('');
    expect(derived.xpub).toBe(BIP32_MASTER_XPUB);
  });

  it('derives same public keys as XprivWallet', async () => {
    const xprivWallet = new XprivWallet(new Xpriv(BIP32_MASTER_XPRIV));
    const fromXpriv = await xprivWallet.derive(DERIVATION_PATH);
    const fromXpub = await wallet.derive(DERIVATION_PATH);
    expect(fromXpub.publicKeyHex).toBe(fromXpriv.publicKeyHex);
    expect(fromXpub.xpub).toBe(fromXpriv.xpub);
  });
});
