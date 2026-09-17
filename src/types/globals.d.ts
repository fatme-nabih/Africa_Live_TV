export type AppRole = 'admin' | 'moderator' | 'user';

declare global {
  interface CustomJwtSessionClaims {
    metadata?: { role?: AppRole };
  }
}
