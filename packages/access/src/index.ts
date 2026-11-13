// Placeholder export
export const access = { name: '@otomix/access' };

export { issueAccessToken } from './token/issue';
export type {
  AccessTokenClaims,
  AccessTokenIssueInput,
  IssuedAccessToken,
  Tier,
  VaultClient,
} from './token/types';
export { TokenIssuanceError } from './token/types';
export { issueRefreshToken, rotateRefreshToken } from './token/refresh';
export type {
  RefreshTokenClaims,
  RefreshTokenIssueInput,
  IssuedRefreshToken,
  RefreshTokenStatus,
} from './token/types';
export {
  RefreshTokenReuseError,
  RefreshTokenRevokedError,
  RefreshTokenNotFoundError,
} from './token/types';
export {
  denyJti,
  denyFamily,
  isDenied,
  isFamilyDenied,
  TokenRevokedError,
} from './token/denylist';
export { revokeUser } from './token/revoke-user';
export {
  OTOMIX_ISSUABLE_SCOPES,
  isIssuable,
  assertIssuable,
  ScopeNotIssuableError,
} from './scope-allowlist';