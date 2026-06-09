export interface AuthenticatedUser {
  userId: string;
  authSubjectId: string;
  authenticatedAt?: Date;
}
