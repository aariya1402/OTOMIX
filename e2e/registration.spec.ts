import { expect, test } from '@playwright/test';

test('registration consent gates Google authentication', async ({ page }) => {
  let observedTermsVersion: string | null = null;
  await page.route(/\/auth\/google\/start\?/, async (route) => {
    const url = new URL(route.request().url());
    observedTermsVersion = url.searchParams.get('terms_version');
    await route.fulfill({ status: 200, contentType: 'text/html', body: 'OAuth start intercepted' });
  });

  await page.goto('/register');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: 'Create your OTOMIX account' })).toBeVisible();
  await page.getByRole('tab', { name: 'Google' }).click();

  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('alert')).toContainText('accept terms v1.0');
  await expect(page).toHaveURL(/\/register$/);

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/auth\/google\/start\?terms_version=v1\.0$/);
  await expect(page.getByText('OAuth start intercepted')).toBeVisible();
  expect(observedTermsVersion).toBe('v1.0');
});
