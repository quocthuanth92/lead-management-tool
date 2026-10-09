import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

import { PasswordHasherPort } from '../domain/ports/password-hasher.port';

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const DUMMY_HASH = `scrypt$${'00'.repeat(SALT_BYTES)}$${'00'.repeat(KEY_BYTES)}`;

@Injectable()
export class ScryptPasswordHasher implements PasswordHasherPort {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derivedKey = (await scrypt(password, salt, KEY_BYTES)) as Buffer;
    return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const parts = encodedHash.split('$');
    const saltHex = parts[1];
    const hashHex = parts[2];
    if (
      parts.length !== 3 ||
      parts[0] !== 'scrypt' ||
      !saltHex ||
      !hashHex ||
      saltHex.length !== SALT_BYTES * 2 ||
      hashHex.length !== KEY_BYTES * 2 ||
      !/^[\da-f]+$/i.test(saltHex) ||
      !/^[\da-f]+$/i.test(hashHex)
    ) {
      await this.verify(password, DUMMY_HASH);
      return false;
    }

    const expected = Buffer.from(hashHex, 'hex');
    const actual = (await scrypt(password, Buffer.from(saltHex, 'hex'), KEY_BYTES)) as Buffer;
    return timingSafeEqual(actual, expected);
  }
}
