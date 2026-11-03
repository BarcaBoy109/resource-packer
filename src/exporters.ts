import { strToU8, zip } from 'fflate';
import { findAsset, findProfile, loadCatalog } from './catalog';
import type { Project } from './domain';
const encode = (value: string) => strToU8(value);
function checkBytes(data: ArrayBuffer, kind: 'texture' | 'sound', label: string) { const b = new Uint8Array(data); if (!b.length || b.length > 16 * 1024 * 1024) throw Error(`${label}: asset exceeds the per-file size limit.`); if (kind === 'texture') { const expected = [137, 80, 78, 71, 13, 10, 26, 10]; if (expected.some((x, i) => b[i] !== x) || b.length < 33 || new DataView(data).getUint32(16) === 0 || new DataView(data).getUint32(20) === 0) throw Error(`${label}: replacement is not a PNG image.`); return; } if (b.length < 58 || String.fromCharCode(...b.subarray(0, 4)) !== 'OggS' || b[4] !== 0) throw Error(`${label}: replacement is not Ogg Vorbis.`); const segments = b[26]; let packetSize = 0; for (let i = 0; i < segments; i++) { packetSize += b[27 + i]; if (b[27 + i] < 255) break; } const start = 27 + segments; if (start + packetSize > b.length || packetSize < 7 || b[start] !== 1 || String.fromCharCode(...b.subarray(start + 1, start + 7)) !== 'vorbis') throw Error(`${label}: replacement is not Ogg Vorbis.`); }
async function archiveTexture(data: Uint8Array): Promise<Uint8Array> { const view = new DataView(data.buffer, data.byteOffset, data.byteLength), width = view.getUint32(16), height = view.getUint32(20); if (width !== height) return data; const target = [64, 32, 16].find(size => size <= width); if (!target || target === width) return data; const bitmap = await createImageBitmap(new Blob([data.slice().buffer as ArrayBuffer])); try { const canvas = document.createElement('canvas'); canvas.width = target; canvas.height = target; const context = canvas.getContext('2d'); if (!context) throw Error('This browser cannot downsize the square texture for export.'); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; context.drawImage(bitmap, 0, 0, target, target); const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('Could not encode the downsized PNG for export.')), 'image/png')); return new Uint8Array(await blob.arrayBuffer()); } finally { bitmap.close(); } }
const safePath = (path: string) => !!path && !path.startsWith('/') && !path.includes('\\') && !/^[a-z]:/i.test(path) && !path.split('/').some(part => part === '..' || part === '' || part === '.');
type JavaSound = { replace: true; sounds: { name: string; stream?: true; attenuation_distance?: number }[]; subtitle?: string };

export async function buildPack(project: Project): Promise<Uint8Array> {
  if (!project.edits.length) throw Error('Add at least one replacement before exporting.');
  const profile = findProfile(project.edition, project.gameVersion);
  if (!profile) throw Error('This exact edition/version profile is not enabled.');
  const invalid = project.edits.find(e => !e.valid); if (invalid) throw Error(`${invalid.fileName}: ${invalid.message}`);
  const available = await loadCatalog(project.edition, project.gameVersion);
  const files: Record<string, Uint8Array> = {}, destinations = new Set<string>(), javaSounds: Record<string, JavaSound> = {}; let total = 0;
  for (const edit of project.edits) {
    const asset = findAsset(available, edit);
    if (!asset) throw Error(`${edit.fileName}: replacement does not map to a catalogued target for ${profile.label}.`);
    if (project.edition === 'bedrock' && asset.kind === 'sound') throw Error('Bedrock sound event overrides are not enabled. Texture replacements can still be exported.');
    checkBytes(edit.bytes, asset.kind, edit.fileName);
    total += edit.bytes.byteLength; if (total > 100 * 1024 * 1024) throw Error('Project assets exceed the 100 MiB total limit.');
    // Custom clips live in a reserved folder so they never overwrite a vanilla clip
    // that other events may share.
    const clip = asset.kind === 'sound' ? `resource_packer/${asset.event!.replaceAll('.', '/')}` : '';
    const path = asset.kind === 'sound' ? `assets/minecraft/sounds/${clip}.ogg` : project.edition === 'java' ? `assets/minecraft/${asset.path}` : asset.path;
    if (!safePath(path) || destinations.has(path)) throw Error(`Unsafe or conflicting destination: ${path}`);
    destinations.add(path);
    const data = new Uint8Array(edit.bytes);
    if (asset.kind === 'sound') {
      files[path] = data;
      javaSounds[asset.event!] = { replace: true, sounds: [{ name: clip, ...(asset.stream ? { stream: true as const } : {}), ...(asset.attenuation != null ? { attenuation_distance: asset.attenuation } : {}) }], ...(asset.subtitle ? { subtitle: asset.subtitle } : {}) };
    } else files[path] = await archiveTexture(data);
  }
  if (project.packIcon) { checkBytes(project.packIcon.bytes, 'texture', 'Pack icon'); total += project.packIcon.bytes.byteLength; if (total > 100 * 1024 * 1024) throw Error('Project assets exceed the 100 MiB total limit.'); files[project.edition === 'java' ? 'pack.png' : 'pack_icon.png'] = new Uint8Array(project.packIcon.bytes); }
  if (project.edition === 'java') {
    const [major, minor] = profile.java!.resourceFormat;
    // Java 1.21.9 notes: resource format 65+ uses min_format/max_format; older formats require pack_format.
    const pack = major >= 65 ? { pack_format: major, min_format: [major, minor], max_format: [major, minor], description: project.description } : { pack_format: major, description: project.description };
    files['pack.mcmeta'] = encode(JSON.stringify({ pack }, null, 2));
    if (Object.keys(javaSounds).length) files['assets/minecraft/sounds.json'] = encode(JSON.stringify(javaSounds, null, 2));
  } else {
    if (project.headerUuid === project.moduleUuid) throw Error('Bedrock header and module UUIDs must be different.');
    files['manifest.json'] = encode(JSON.stringify({ format_version: 2, header: { name: project.name, description: project.description, uuid: project.headerUuid, version: project.packVersion, min_engine_version: profile.bedrock!.engineVersion }, modules: [{ type: 'resources', uuid: project.moduleUuid, version: project.packVersion }] }, null, 2));
  }
  return new Promise((resolve, reject) => zip(files, { level: 6 }, (error, data) => error ? reject(error) : resolve(data)));
}
