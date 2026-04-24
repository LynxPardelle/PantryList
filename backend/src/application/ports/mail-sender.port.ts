export interface PasswordResetMailPayload {
  email: string;
  username: string;
  resetToken: string;
  expiresAt: Date;
}

export interface MailSender {
  sendPasswordResetMail(payload: PasswordResetMailPayload): Promise<void>;
}
