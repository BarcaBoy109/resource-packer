import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isMp3, prepareSound } from '../../src/sound-upload';
import { catalog } from '../../src/domain';

describe('MP3 inputs', () => {
  it('recognizes actual MPEG Layer III data, with or without ID3 tags', () => {
    const fixture = readFileSync('tests/fixtures/generated-tone.mp3');
    expect(isMp3(fixture)).toBe(true);
    const tagged = new Uint8Array(fixture.length + 10);
    tagged.set([73, 68, 51, 4, 0, 0, 0, 0, 0, 0]);
    tagged.set(fixture, 10);
    expect(isMp3(tagged)).toBe(true);
  });
  it('does not treat renamed files or tag-only bytes as MP3', () => {
    expect(isMp3(readFileSync('tests/fixtures/generated-tone.ogg'))).toBe(false);
    expect(isMp3(new TextEncoder().encode('RIFF fake WAV audio'))).toBe(false);
    expect(isMp3(new Uint8Array([73, 68, 51]))).toBe(false);
  });
  it('rejects oversized input before decoding', async () => {
    const asset = catalog('java').find(asset => asset.kind === 'sound')!;
    await expect(prepareSound(new File([new Uint8Array(16 * 1024 * 1024 + 1)], 'big.mp3'),
      asset, new AbortController().signal, () => {})).rejects.toThrow('16 MiB');
  });
});
