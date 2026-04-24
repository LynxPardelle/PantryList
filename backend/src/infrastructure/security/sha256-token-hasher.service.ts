import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { TokenHasher } from '../../application/ports/token-hasher.port';

@Injectable()
export class Sha256TokenHasherService implements TokenHasher {
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
