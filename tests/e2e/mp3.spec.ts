import { test, expect, type Download } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';

async function downloadedBytes(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('converts stereo MP3 to playable mono Vorbis, persists, backs up, and exports it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Sounds/ }).click();
  await page.locator('.asset').filter({ hasText: 'Chest opens' }).click();
  await page.getByLabel('Choose MP3 or Ogg file').setInputFiles('tests/fixtures/generated-tone.mp3');
  await expect(page.locator('p.valid')).toContainText('Converted MP3', { timeout: 30000 });
  await expect(page.locator('p.valid')).toContainText('1 channel');
  await expect(page.locator('audio')).toBeVisible();
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator('.changes')).toContainText('generated-tone.mp3');
  const backupWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Project backup' }).click();
  const backup = await backupWait;
  await page.locator('.backup-actions input').setInputFiles((await backup.path())!);
  await expect(page.getByRole('status')).toContainText('Project backup imported');
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download Java ZIP/ }).click();
  const archive = unzipSync(await downloadedBytes(await wait));
  const audio = archive['assets/minecraft/sounds/block/chest/open.ogg'];
  expect(new TextDecoder().decode(audio.subarray(0, 4))).toBe('OggS');
  const packet = 27 + audio[26];
  expect(new TextDecoder().decode(audio.subarray(packet + 1, packet + 7))).toBe('vorbis');
  expect(audio[packet + 11]).toBe(1);
  const decoded = await page.evaluate(async (values) => {
    const buffer = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(new Uint8Array(values).buffer);
    return { channels: buffer.numberOfChannels, duration: buffer.duration,
      peak: buffer.getChannelData(0).reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0) };
  }, Array.from(audio));
  expect(decoded.channels).toBe(1);
  expect(decoded.duration).toBeGreaterThan(0.8);
  expect(decoded.duration).toBeLessThan(1.2);
  expect(decoded.peak).toBeGreaterThan(0.01);
  expect(JSON.parse(strFromU8(archive['assets/minecraft/sounds.json']))['block.chest.open'].replace).toBe(true);
  expect(Object.keys(archive).some(path => path.endsWith('.mp3'))).toBe(false);
});

test('hides sound editing when switching from Java Sounds to Bedrock and after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Sounds/ }).click();
  await page.locator('.asset').filter({ hasText: 'Chest opens' }).click();
  await page.getByLabel('Edition').selectOption('bedrock');
  await expect(page.getByRole('tab', { name: /Sounds/ })).toHaveCount(0);
  await expect(page.getByLabel('Choose MP3 or Ogg file')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Blocks/ })).toHaveAttribute('aria-selected', 'true');
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByLabel('Edition')).toHaveValue('bedrock');
  await expect(page.getByRole('tab', { name: /Sounds/ })).toHaveCount(0);
});

test('rejects a fake MP3 and leaves the editor usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Sounds/ }).click();
  await page.locator('.asset').filter({ hasText: 'Chest opens' }).click();
  await page.getByLabel('Choose MP3 or Ogg file').setInputFiles({
    name: 'fake.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('not audio'),
  });
  await expect(page.locator('p.invalid')).toBeVisible();
  await expect(page.getByRole('button', { name: /Download Java ZIP/ })).toBeDisabled();
  await expect(page.getByLabel('Edition')).toBeEnabled();
});

test('can cancel MP3 conversion without adding an edit or changing targets', async ({ page }) => {
  let releaseWorker!: () => void;
  const holdWorker = new Promise<void>(resolve => { releaseWorker = resolve; });
  await page.route('**/*vorbis.worker*', async route => {
    await holdWorker;
    await route.abort().catch(() => {});
  });
  await page.goto('/');
  await page.getByRole('tab', { name: /Sounds/ }).click();
  await page.locator('.asset').filter({ hasText: 'Chest opens' }).click();
  const requested = page.waitForRequest(request => request.url().includes('vorbis.worker'));
  await page.getByLabel('Choose MP3 or Ogg file').setInputFiles('tests/fixtures/generated-tone.mp3');
  await requested;
  await expect(page.getByLabel('Edition')).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel upload' }).click();
  releaseWorker();
  await expect(page.getByLabel('Edition')).toBeEnabled();
  await expect(page.getByRole('button', { name: /Download Java ZIP/ })).toBeDisabled();
  await expect(page.locator('.changes')).toHaveCount(0);
});
