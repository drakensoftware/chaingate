import { describe, it, expect, vi } from 'vitest';
import { PhraseWallet, Phrase, PrivateKey, DerivedKey } from '../src';
import { MNEMONIC, DERIVATION_PATH, PRIV_HEX, EXPECTED_XPRIV, EXPECTED_XPUB } from './fixtures';

describe('PhraseWallet', () => {
  const wallet = new PhraseWallet(new Phrase(MNEMONIC));

  it('getPhrase returns the Phrase', async () => {
    expect(await wallet.getPhrase()).toBeInstanceOf(Phrase);
    expect((await wallet.getPhrase()).words.join(' ')).toBe(MNEMONIC);
  });

  it('serialize returns json with type and phrase', async () => {
    const serialized = await wallet.serialize({ acknowledge: true });
    expect(serialized).toMatchObject({ type: 'phrase', phrase: MNEMONIC });
    expect(serialized).toHaveProperty('derivationIndex');
    expect(serialized).toHaveProperty('masterPublicKey');
  });

  it('serialize warns when acknowledge is not set', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await wallet.serialize();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toMatch(/unencrypted/);
    spy.mockRestore();
  });

  it('serialize does not warn when acknowledge is true', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await wallet.serialize({ acknowledge: true });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
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
    expect(derived.publicKey).toBeInstanceOf(Uint8Array);
    expect(derived.publicKey.length).toBe(33);
  });

  it('derive gives correct xpriv and xpub', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.xpriv).toBe(EXPECTED_XPRIV);
    expect(derived.xpub).toBe(EXPECTED_XPUB);
  });
});
