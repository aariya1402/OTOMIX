import { OAuth2Client } from 'google-auth-library';

export function createOAuthClient(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): OAuth2Client {
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}
