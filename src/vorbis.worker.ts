import createEncoder from '@audio/encode-ogg';

self.onmessage = async (event: MessageEvent<{ channels: Float32Array[]; sampleRate: number }>) => {
  let encoder: Awaited<ReturnType<typeof createEncoder>> | undefined;
  try {
    const { channels, sampleRate } = event.data;
    const mono = new Float32Array(channels[0].length);
    for (const channel of channels) {
      for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length;
    }
    encoder = await createEncoder({ sampleRate, channels: 1, quality: 5 });
    const chunks: Uint8Array[] = [];
    for (let offset = 0; offset < mono.length; offset += 16384) {
      chunks.push(encoder.encode([mono.subarray(offset, offset + 16384)]).slice());
      self.postMessage({ progress: Math.min(99, Math.round((offset + 16384) / mono.length * 100)) });
    }
    chunks.push(encoder.flush().slice());
    const output = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
    self.postMessage({ bytes: output.buffer }, { transfer: [output.buffer] });
  } catch {
    self.postMessage({ error: 'Could not convert this MP3. Try another file or upload Ogg Vorbis.' });
  } finally {
    encoder?.free();
  }
};
