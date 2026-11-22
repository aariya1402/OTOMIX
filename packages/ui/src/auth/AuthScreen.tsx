import { useState, type FormEvent } from 'react';
import type {
  AuthMode,
  AuthProvider,
  AuthRequest,
  AuthSuccessResponse,
  TelegramProvider,
} from './types';

export const TERMS_VERSION = 'v1.0';

async function readAuthSuccess(response: Response): Promise<AuthSuccessResponse> {
  const body: unknown = await response.json();
  if (
    typeof body !== 'object' ||
    body === null ||
    !('user_id' in body) ||
    typeof body.user_id !== 'string' ||
    !('access_token' in body) ||
    typeof body.access_token !== 'string'
  ) {
    throw new Error('Authentication response is missing user_id or access_token.');
  }
  return { user_id: body.user_id, access_token: body.access_token };
}

export interface AuthScreenProps {
  initialMode?: AuthMode;
  request?: AuthRequest;
  navigate?: (url: string) => void;
  telegramProvider?: TelegramProvider;
  onSuccess?: (value: AuthSuccessResponse) => void;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function defaultNavigate(url: string): void {
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
}

export function AuthScreen({
  initialMode = 'login',
  request,
  navigate,
  telegramProvider,
  onSuccess,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [provider, setProvider] = useState<AuthProvider>('google');
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendRequest = request || ((input, init) =>
    fetch(input, init));
  const navigateRequest = navigate || defaultNavigate;

  function requireConsent(): boolean {
    if (consented) {
      setError('');
      return true;
    }
    setError('You must accept terms v1.0 before continuing.');
    return false;
  }

  function startGoogle(): void {
    if (!requireConsent()) return;
    navigateRequest(
      `/auth/google/start?terms_version=${encodeURIComponent(TERMS_VERSION)}`,
    );
  }

  async function verifyTelegram(): Promise<void> {
    if (!requireConsent()) return;
    if (!telegramProvider) {
      setError('Telegram provider is not configured.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const providerData = await telegramProvider();
      const response = await sendRequest('/auth/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...providerData,
          terms_version: TERMS_VERSION,
        }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      onSuccess?.(await readAuthSuccess(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Telegram verification failed.');
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!requireConsent()) return;

    setBusy(true);
    setError('');
    try {
      const response = await sendRequest('/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_e164: phone,
          terms_version: TERMS_VERSION,
        }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      await response.json();
      setCodeSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'OTP send failed.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!requireConsent()) return;

    setBusy(true);
    setError('');
    try {
      const response = await sendRequest('/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_e164: phone,
          code,
          terms_version: TERMS_VERSION,
        }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      onSuccess?.(await readAuthSuccess(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'OTP verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Authentication">
      <h1>{mode === 'login' ? 'Log in to OTOMIX' : 'Create your OTOMIX account'}</h1>
      <div role="group" aria-label="Authentication mode">
        <button
          type="button"
          aria-pressed={mode === 'login'}
          onClick={() => {
            setMode('login');
            setError('');
          }}
        >
          Login
        </button>
        <button
          type="button"
          aria-pressed={mode === 'register'}
          onClick={() => {
            setMode('register');
            setError('');
          }}
        >
          Register
        </button>
      </div>

      <div role="tablist" aria-label="Authentication provider">
        {([
          ['google', 'Google'],
          ['telegram', 'Telegram'],
          ['phone', 'Phone OTP'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={provider === id}
            onClick={() => {
              setProvider(id);
              setError('');
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <label>
        <input
          type="checkbox"
          checked={consented}
          onChange={(event) => setConsented(event.currentTarget.checked)}
        />
        I accept terms v1.0
      </label>

      {error ? <div role="alert">{error}</div> : null}

      {provider === 'google' ? (
        <button type="button" onClick={startGoogle} disabled={busy}>
          Continue with Google
        </button>
      ) : null}

      {provider === 'telegram' ? (
        <button
          type="button"
          onClick={() => void verifyTelegram()}
          disabled={busy}
        >
          Continue with Telegram
        </button>
      ) : null}

      {provider === 'phone' ? (
        <form onSubmit={codeSent ? verifyOtp : sendOtp}>
          <label htmlFor="auth-phone">Phone number</label>
          <input
            id="auth-phone"
            name="phone_e164"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.currentTarget.value)}
            placeholder="+989123456789"
            required
          />

          {codeSent ? (
            <>
              <label htmlFor="auth-otp-code">Verification code</label>
              <input
                id="auth-otp-code"
                name="code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.currentTarget.value)}
                required
              />
            </>
          ) : null}

          <button type="submit" disabled={busy}>
            {codeSent ? 'Verify code' : 'Send code'}
          </button>
        </form>
      ) : null}
    </section>
  );
}

export const AuthRegistrationLogin = AuthScreen;
