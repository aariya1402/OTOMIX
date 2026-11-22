// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthScreen } from '../src/auth/AuthScreen';

function jsonResponse(ok: boolean, body: unknown, status = ok ? 200 : 400): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => cleanup());

describe('P07-REG-M06 AuthScreen', () => {
  it('renders login and registration modes with the three provider tabs', () => {
    render(<AuthScreen />);

    expect(screen.getByRole('heading', { name: 'Log in to OTOMIX' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Login' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByRole('heading', { name: 'Create your OTOMIX account' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Google' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Telegram' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Phone OTP' })).toBeTruthy();
  });

  it('takes no provider action without terms consent', () => {
    const navigate = vi.fn();
    const request = vi.fn();
    const telegramProvider = vi.fn();
    render(
      <AuthScreen
        navigate={navigate}
        request={request}
        telegramProvider={telegramProvider}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Telegram' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Telegram' }));
    expect(request).not.toHaveBeenCalled();
    expect(telegramProvider).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Phone OTP' }));
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+989123456789' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(request).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('accept terms v1.0');
  });

  it('starts Google with the v1.0 terms contract after consent', () => {
    const navigate = vi.fn();
    render(<AuthScreen navigate={navigate} />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(navigate).toHaveBeenCalledWith('/auth/google/start?terms_version=v1.0');
  });

  it('verifies Telegram provider-signed fields with terms_version', async () => {
    const request = vi.fn().mockResolvedValue(
      jsonResponse(true, { user_id: 'u1', access_token: 'token' }),
    );
    const telegramProvider = vi.fn().mockResolvedValue({
      id: '123',
      first_name: 'Test',
      auth_date: '1700000000',
      hash: 'signed-hash',
    });
    render(
      <AuthScreen request={request} telegramProvider={telegramProvider} />,
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('tab', { name: 'Telegram' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Telegram' }));

    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request).toHaveBeenCalledWith(
      '/auth/telegram/verify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          id: '123',
          first_name: 'Test',
          auth_date: '1700000000',
          hash: 'signed-hash',
          terms_version: 'v1.0',
        }),
      }),
    );
  });

  it('renders request errors and supports the phone send and verify contract', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(false, { message: 'OTP service unavailable' }, 503),
      )
      .mockResolvedValueOnce(jsonResponse(true, { sent: true, ttl_sec: 120 }))
      .mockResolvedValueOnce(jsonResponse(false, { message: 'Invalid code' }, 401));
    render(<AuthScreen request={request} />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('tab', { name: 'Phone OTP' }));
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+989123456789' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'OTP service unavailable',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByRole('button', { name: 'Verify code' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Verification code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Invalid code',
    );

    expect(request.mock.calls[1][0]).toBe('/auth/otp/send');
    expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({
      phone_e164: '+989123456789',
      terms_version: 'v1.0',
    });
    expect(request.mock.calls[2][0]).toBe('/auth/otp/verify');
    expect(JSON.parse(request.mock.calls[2][1].body)).toEqual({
      phone_e164: '+989123456789',
      code: '123456',
      terms_version: 'v1.0',
    });
  });
});
