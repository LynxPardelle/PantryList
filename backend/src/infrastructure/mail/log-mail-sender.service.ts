import { Injectable, Logger } from '@nestjs/common';
import {
  MailSender,
  PasswordResetMailPayload,
} from '../../application/ports/mail-sender.port';

@Injectable()
export class LogMailSenderService implements MailSender {
  private readonly logger = new Logger(LogMailSenderService.name);

  sendPasswordResetMail(payload: PasswordResetMailPayload): Promise<void> {
    this.logger.log(
      `Password reset requested for ${payload.email}. Token expires at ${payload.expiresAt.toISOString()}.`,
    );
    return Promise.resolve();
  }
}
