import { BadRequestException } from '@nestjs/common';

export function assertStrongPassword(password: string): void {
  const normalizedPassword = password?.trim() ?? '';

  if (normalizedPassword.length < 12) {
    throw new BadRequestException(
      'Password must contain at least 12 characters',
    );
  }
}
