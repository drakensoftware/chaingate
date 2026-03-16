import { describe, it, expect } from 'vitest';
import { PublicKeyWallet, PublicKey } from '../src';
import { PUB_HEX } from './fixtures';

describe('PublicKeyWallet', () => {
  const wallet = new PublicKeyWallet(new PublicKey(PUB_HEX));

  it('getPublicKey returns the PublicKey', () => {
    const pk = wallet.getPublicKey();
    expect(pk).toBeInstanceOf(PublicKey);
    expect(pk.hex).toBe(PUB_HEX);
  });

  it('serialize returns json with type and publicKey', async () => {
    expect(await wallet.serialize()).toEqual({ type: 'publicKey', publicKey: PUB_HEX });
  });

  it('serialize does not require acknowledge option', async () => {
    const serialized = await wallet.serialize();
    expect(serialized.type).toBe('publicKey');
  });
});
