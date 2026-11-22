import { expect, test } from '@playwright/test';

test('seeded tenant can queue three tracks, compute a timeline, and preview a plan', async ({ page }) => {
  await page.goto('/journey');
  await expect(page.getByRole('heading', { name: 'OTOMIX P08 journey harness' })).toBeVisible();
  await expect(page.getByText(/Seeded signed-in tenant; 3 uploaded tracks/)).toBeVisible();

  for (const trackId of ['track-1', 'track-2', 'track-3']) {
    await page.getByRole('button', { name: new RegExp(`^${trackId},`) }).click();
  }

  await expect(page.getByRole('button', { name: 'Remove track-1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove track-2' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove track-3' })).toBeVisible();
  await expect(page.getByLabel('Timeline')).toHaveText('Timeline beats: 6');

  await page.getByRole('button', { name: 'Build plan' }).click();
  await expect(page.getByLabel('Plan status')).toHaveText('Mix plan ready');
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByLabel('Preview status')).toHaveText('Preview scheduled: 1');
  await expect(page.getByLabel('DSP automation count')).toHaveText('DSP automations: 2');
});
