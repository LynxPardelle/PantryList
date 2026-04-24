import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

@Injectable()
export class Argon2PasswordHasherService implements PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return argon2.hash(plainText, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(hash: string, plainText: string): Promise<boolean> {
    return argon2.verify(hash, plainText);
  }
}
