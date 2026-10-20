// Original stereo sine tone; no Minecraft or third-party audio.
import mp3 from '@audio/encode-mp3';
import { writeFile } from 'node:fs/promises';
import { URL } from 'node:url';
const sampleRate = 44100;
const left = Float32Array.from({ length: sampleRate }, (_, i) => Math.sin(i * 2 * Math.PI * 440 / sampleRate) * 0.15);
const right = Float32Array.from({ length: sampleRate }, (_, i) => Math.sin(i * 2 * Math.PI * 660 / sampleRate) * 0.15);
const encoder = await mp3({ sampleRate, channels: 2, bitrate: 128 });
try {
  const audio = encoder.encode([left, right]).slice();
  const tail = encoder.flush().slice();
  const output = new Uint8Array(audio.length + tail.length);
  output.set(audio);
  output.set(tail, audio.length);
  const head = encoder.head();
  if (head) output.set(head);
  await writeFile(new URL('./generated-tone.mp3', import.meta.url), output);
} finally { encoder.free(); }
