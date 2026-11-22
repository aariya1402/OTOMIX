export type AuthMode = 'login' | 'register';
export type AuthProvider = 'google' | 'telegram' | 'phone';

export type AuthRequest = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface AuthSuccessResponse {
  user_id: string;
  access_token: string;
}

export type TelegramProviderInput = Record<string, string>;
export type TelegramProvider = () =>
  | TelegramProviderInput
  | Promise<TelegramProviderInput>;
