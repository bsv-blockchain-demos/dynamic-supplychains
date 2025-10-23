import { Random, SymmetricKey, Utils } from "@bsv/sdk";

describe('Encryption Test Suite', () => {
  it('should decrypt the encrypted data with the same key', () => {
    const key = Random(32);
    // SymmetricKey2 showcases that we get the same key from SymmetricKey as long as the value given stays the same
    const symmetricKey = new SymmetricKey(key);
    const symmetricKey2 = new SymmetricKey(key);

    const data = 'Hello, World!';

    const encrypted = symmetricKey.encrypt(data);
    const decrypted = symmetricKey2.decrypt(encrypted) as number[];
    expect(Utils.toUTF8(decrypted)).toBe(data);
  });

  it('should throw an error when decrypting with a different key', () => {
    // With a key that's even 1 byte off, decryption should fail
    const key = Random(32);
    const key2 = key.slice(0, 31);
    const symmetricKey = new SymmetricKey(key);
    const symmetricKey2 = new SymmetricKey(key2);

    const data = 'Hello, World!';

    const encrypted = symmetricKey.encrypt(data);
    expect(() => symmetricKey2.decrypt(encrypted)).toThrow();
  });

  it('should throw an error when decrypting with a key that is too short', () => {
    // With a short key, key creation and encryption should work, but decryption should fail
    const random = Random(32);
    const key = random.slice(0, 8);
    const symmetricKey = new SymmetricKey(key);

    const data = 'Hello, World!';

    const encrypted = symmetricKey.encrypt(data);
    expect(symmetricKey).toBeDefined();
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(data);
    expect(() => symmetricKey.decrypt(encrypted)).toThrow();
  });
});
