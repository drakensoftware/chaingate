import { describe, it, expect } from 'vitest';
import { SeedWallet, Seed, PrivateKey, DerivedKey } from '../src';
import { SEED_HEX, DERIVATION_PATH, PRIV_HEX } from './fixtures';

describe('SeedWallet', () => {
  const wallet = new SeedWallet(new Seed(SEED_HEX));

  it('serialize returns json with type and seed', async () => {
    const serialized = await wallet.serialize({ acknowledge: true });
    expect(serialized).toMatchObject({ type: 'seed', seed: SEED_HEX });
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
    expect(derived.publicKey).toBeInstanceOf(Uint8Array);
    expect(derived.publicKey.length).toBe(33);
  });

  it('derive gives xpriv and xpub', async () => {
    const derived = await wallet.derive(DERIVATION_PATH);
    expect(derived.xpriv).toMatch(/^xprv/);
    expect(derived.xpub).toMatch(/^xpub/);
  });
});
