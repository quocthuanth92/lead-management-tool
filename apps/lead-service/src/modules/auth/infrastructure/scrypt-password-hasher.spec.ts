import { ScryptPasswordHasher } from './scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('stores unique salted hashes and verifies matching passwords only', async () => {
    const first = await hasher.hash('secret');
    const second = await hasher.hash('secret');
    expect(first).toMatch(/^scrypt\$[a-f\d]{32}\$[a-f\d]{128}$/);
    expect(second).not.toBe(first);
    await expect(hasher.verify('secret', first)).resolves.toBe(true);
    await expect(hasher.verify('other', first)).resolves.toBe(false);
  });

  it('rejects malformed hashes without throwing', async () => {
    await expect(hasher.verify('secret', 'bad-hash')).resolves.toBe(false);
  });
});
