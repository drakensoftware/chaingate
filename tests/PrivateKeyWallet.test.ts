import { describe, it, expect } from 'vitest';
import { PrivateKeyWallet, PrivateKey, PublicKey } from '../src';
import { PRIV_HEX, PUB_HEX } from './fixtures';

describe('PrivateKeyWallet', () => {
  const wallet = new PrivateKeyWallet(new PrivateKey(PRIV_HEX));

  it('getPrivateKey returns the PrivateKey', async () => {
    const pk = await wallet.getPrivateKey();
    expect(pk).toBeInstanceOf(PrivateKey);
    expect(pk.hex).toBe(PRIV_HEX);
  });

  it('getPublicKey returns a PublicKey with compressed hex', async () => {
    const pub = await wallet.getPublicKey();
    expect(pub).toBeInstanceOf(PublicKey);
    expect(pub.hex).toBe(PUB_HEX);
  });

  it('publicKey getter returns hex string', () => {
    expect(wallet.publicKey).toBe(PUB_HEX);
  });

  it('serialize returns json with type and privateKey', async () => {
    const serialized = await wallet.serialize({ acknowledge: true });
    expect(serialized).toMatchObject({ type: 'privateKey', privateKey: PRIV_HEX });
    expect(serialized).toHaveProperty('publicKey', PUB_HEX);
  });
});
