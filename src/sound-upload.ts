import type { Asset, Edit } from './domain';
import { LIMITS, validateFile } from './validation';

export const MAX_MP3_SECONDS = 120;

// ID3 tags are optional; require an MPEG Layer III frame after any tag.
export function isMp3(bytes: Uint8Array): boolean {
  let start = 0;
  if (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) {
    if (bytes.length < 10 || bytes.slice(6, 10).some(n => n > 127)) return false;
    start = 10 + (bytes[6] << 21) + (bytes[7] << 14) + (bytes[8] << 7) + bytes[9];
  }
  for (let i = start; i < Math.min(start + 4096, bytes.length - 3); i++) {
    if (bytes[i] === 255 && (bytes[i + 1] & 224) === 224 &&
        (bytes[i + 1] & 24) !== 8 && (bytes[i + 1] & 6) === 2 &&
        (bytes[i + 2] & 240) !== 0 && (bytes[i + 2] & 240) !== 240 &&
        (bytes[i + 2] & 12) !== 12) return true;
  }
  return false;
}

function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Conversion cancelled.', 'AbortError');
}

function readDuration(bytes: ArrayBuffer, signal: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    const finish = (error?: Error) => {
      const duration = audio.duration;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
      if (error) reject(error); else resolve(duration);
    };
    const abort = () => finish(new DOMException('Conversion cancelled.', 'AbortError'));
    const timer = setTimeout(() => finish(Error('Could not read MP3 duration. Try another file.')), 10000);
    signal.addEventListener('abort', abort, { once: true });
    audio.onloadedmetadata = () => finish();
    audio.onerror = () => finish(Error('This MP3 cannot be decoded. Try another file.'));
    audio.preload = 'metadata';
    audio.src = url;
  });
}

function encodeVorbis(audio: AudioBuffer, signal: AbortSignal, status: (message: string) => void) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const worker = new Worker(new URL('./vorbis.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); };
    const fail = (error: Error) => { cleanup(); reject(error); };
    const abort = () => fail(new DOMException('Conversion cancelled.', 'AbortError'));
    const timer = setTimeout(() => fail(Error('Conversion timed out. Try a shorter MP3.')), 90000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => fail(Error('Audio converter failed to load. Retry or upload Ogg Vorbis.'));
    worker.onmessage = (event: MessageEvent<{ bytes?: ArrayBuffer; error?: string; progress?: number }>) => {
      if (event.data.error) fail(Error(event.data.error));
      else if (event.data.bytes) { cleanup(); resolve(event.data.bytes); }
      else status(`Converting MP3 to Ogg Vorbis… ${event.data.progress ?? 0}%`);
    };
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i).slice());
    worker.postMessage({ channels, sampleRate: audio.sampleRate }, channels.map(channel => channel.buffer));
  });
}

export async function prepareSound(file: File, asset: Asset, signal: AbortSignal, status: (message: string) => void): Promise<Edit> {
  if (!file.size || file.size > LIMITS.fileBytes) throw Error('File must be between 1 byte and 16 MiB.');
  checkAbort(signal);
  const bytes = await file.arrayBuffer();
  checkAbort(signal);
  if (!isMp3(new Uint8Array(bytes))) {
    // Existing Ogg support remains strict; renamed MP3/WAV/Opus is not accepted.
    return validateFile(file, asset);
  }
  status('Reading MP3…');
  const duration = await readDuration(bytes, signal);
  checkAbort(signal);
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_MP3_SECONDS) {
    throw Error('MP3 clips must be no longer than 2 minutes. Trim the file and try again.');
  }
  status('Decoding MP3…');
  let audio: AudioBuffer;
  try { audio = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes); }
  catch { throw Error('This MP3 cannot be decoded. Try another file or upload Ogg Vorbis.'); }
  checkAbort(signal);
  if (audio.duration > MAX_MP3_SECONDS || audio.numberOfChannels > 2) throw Error('Use a mono or stereo MP3 no longer than 2 minutes.');
  const output = await encodeVorbis(audio, signal, status);
  checkAbort(signal);
  const converted = await validateFile(new File([output], file.name.replace(/(?:\.mp3)?$/i, '.ogg'), { type: 'audio/ogg' }), asset);
  checkAbort(signal);
  if (!converted.valid) throw Error(converted.message);
  return { ...converted, fileName: file.name, message: `Converted MP3 → ${converted.message} · mono` };
}
