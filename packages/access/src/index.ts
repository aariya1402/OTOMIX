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
export { sendEscalationWebhook } from './escalation-webhook';
export type { EscalationPayload, EscalationWebhookConfig } from './escalation-webhook';
export { createDekService } from './crypto/dek';
export type { DekService, KekProvider, EncryptedBlob } from './crypto/dek';
export { DecryptionFailedError, InvalidKeyError, TenantKeyNotFoundError } from './crypto/dek';

export { shouldRotate, rotateTenantDek, rotateAllDeks, InMemoryDekStore, InMemoryVersionedKekProvider } from './crypto/rotate';
export type { RotationResult } from './crypto/rotate';
export type { DekStore, DekStoreEntry, VersionedKekProvider, CreateDekServiceDeps } from './crypto/dek';

export { writeAdminAudit } from './audit';
export type { AdminAuditInput } from './audit';
