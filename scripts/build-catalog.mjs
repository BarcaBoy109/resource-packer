// Generates version-specific catalogs from pinned Mojang sources.
//
//   node scripts/build-catalog.mjs java 26.3 26.2
//   node scripts/build-catalog.mjs bedrock v1.26.60.5
//
// Java: launcher manifest -> version metadata (SHA-1) -> client.jar (SHA-1) and
// asset index (SHA-1) -> sounds.json (SHA-1). Bedrock: a Mojang/bedrock-samples
// release tag, resolved to its commit. Downloads are cached in .cache/ (ignored by
// git). Output: src/catalogs/<edition>/<hash>.json, src/catalogs/profiles.json and
// content-addressed reference previews in public/previews/sha/. Never run at build
// or export time.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { crc32, deflateSync } from 'node:zlib';
import { unzipSync, strFromU8 } from 'fflate';

const root = new URL('../', import.meta.url);
const cacheDir = new URL('.cache/', root);
const previewDir = new URL('public/previews/sha/', root);
const catalogDir = new URL('src/catalogs/', root);
const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const SAMPLES = 'Mojang/bedrock-samples';

const sha1 = b => createHash('sha1').update(b).digest('hex');
const sha256 = b => createHash('sha256').update(b).digest('hex');
const previewId = b => sha256(b).slice(0, 20);

async function download(url, attempt = 0) {
  const headers = url.startsWith('https://api.github.com/') && process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw Error(`${response.status} ${response.statusText}: ${url}`);
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (attempt < 3 && !String(error.message).startsWith('404')) return download(url, attempt + 1);
    throw error;
  }
}
/** Downloads (or reuses a cached copy of) a file whose SHA-1 is published by Mojang. */
async function verified(url, expectedSha1, name) {
  await mkdir(cacheDir, { recursive: true });
  const file = new URL(`${expectedSha1}-${name}`, cacheDir);
  if (existsSync(file)) {
    const bytes = new Uint8Array(await readFile(file));
    if (sha1(bytes) === expectedSha1) return bytes;
  }
  const bytes = await download(url);
  if (sha1(bytes) !== expectedSha1) throw Error(`SHA-1 mismatch for ${url}`);
  await writeFile(file, bytes);
  return bytes;
}
async function cachedBlob(url, gitSha) {
  const folder = new URL('bedrock-blobs/', cacheDir);
  await mkdir(folder, { recursive: true });
  const file = new URL(gitSha, folder);
  if (existsSync(file)) return new Uint8Array(await readFile(file));
  const bytes = await download(url);
  const blobSha = sha1(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]));
  if (blobSha !== gitSha) throw Error(`Git blob mismatch for ${url}`);
  await writeFile(file, bytes);
  return bytes;
}
const text = b => strFromU8(b).replace(/^\uFEFF/, '');
/** Bedrock sample JSON contains // and block comments; strip them outside strings. */
function parseCommentedJson(source) {
  let out = '', inString = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (inString) { out += c; if (c === '\\') { out += n; i++; } else if (c === '"') inString = false; continue; }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '/' && n === '/') { while (i < source.length && source[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}
async function pool(items, size, task) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (next < items.length) { const i = next++; results[i] = await task(items[i], i); } }));
  return results;
}
const humanize = s => { const t = s.replace(/[_./]+/g, ' ').replace(/\s+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
function pngSize(b) {
  if (b.length < 24 || b[0] !== 137 || b[1] !== 80 || b[2] !== 78 || b[3] !== 71) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}
/** Converts an uncompressed or RLE true-color TGA to PNG for a browser preview only. */
function tgaToPng(b) {
  if (b.length < 18 || b[1] !== 0 || (b[2] !== 2 && b[2] !== 10)) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const w = v.getUint16(12, true), h = v.getUint16(14, true), bpp = b[16], topOrigin = (b[17] & 0x20) !== 0;
  if ((bpp !== 24 && bpp !== 32) || !w || !h || w > 4096 || h > 4096) return null;
  const px = bpp / 8, rgba = new Uint8Array(w * h * 4);
  let p = 18 + b[0], i = 0;
  const put = src => { if (src + px > b.length) throw Error('truncated'); rgba.set([b[src + 2], b[src + 1], b[src], px === 4 ? b[src + 3] : 255], i * 4); i++; };
  try {
    if (b[2] === 2) while (i < w * h) { put(p); p += px; }
    else while (i < w * h) { const head = b[p++], count = (head & 127) + 1; if (head & 128) { const src = p; p += px; for (let k = 0; k < count && i < w * h; k++) put(src); } else for (let k = 0; k < count && i < w * h; k++) { put(p); p += px; } }
  } catch { return null; }
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { const src = topOrigin ? y : h - 1 - y; raw.set(rgba.subarray(src * w * 4, (src + 1) * w * 4), y * (w * 4 + 1) + 1); }
  const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); Buffer.from(data).copy(out, 8); out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}
function tgaSize(b) { if (b.length < 18) return null; const v = new DataView(b.buffer, b.byteOffset, b.byteLength); return { width: v.getUint16(12, true), height: v.getUint16(14, true) }; }
async function writePreview(bytes) {
  const id = previewId(bytes);
  await mkdir(previewDir, { recursive: true });
  const file = new URL(`${id}.png`, previewDir);
  if (!existsSync(file)) await writeFile(file, bytes);
  return id;
}
// Unavailable reasons are codes; user-facing wording lives in src/catalog.ts.
const SOUND_CATEGORY = { block: 'Blocks', entity: 'Entities', item: 'Items', ambient: 'Ambient', music: 'Music', music_disc: 'Music discs', ui: 'User interface', weather: 'Weather', event: 'Events', enchant: 'Enchantments', particle: 'Particles', intentionally_empty: 'Other' };

async function saveCatalog(edition, catalog) {
  const body = JSON.stringify(catalog);
  const id = sha256(body).slice(0, 16);
  await mkdir(new URL(`${edition}/`, catalogDir), { recursive: true });
  await writeFile(new URL(`${edition}/${id}.json`, catalogDir), body);
  return `${edition}/${id}`;
}
async function saveProfile(profile) {
  const file = new URL('profiles.json', catalogDir);
  const profiles = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : [];
  const next = [...profiles.filter(p => !(p.edition === profile.edition && p.version === profile.version)), profile];
  next.sort((a, b) => a.edition.localeCompare(b.edition) || b.order.localeCompare(a.order));
  await writeFile(file, JSON.stringify(next, null, 2) + '\n');
}

// ---------------------------------------------------------------- Java
async function buildJava(id, manifest) {
  const entry = manifest.versions.find(v => v.id === id);
  if (!entry || entry.type !== 'release') throw Error(`${id} is not a release in Mojang's launcher manifest.`);
  const meta = JSON.parse(text(await verified(entry.url, entry.sha1, `${id}.json`)));
  const client = meta.downloads.client;
  const jar = await verified(client.url, client.sha1, 'client.jar');
  const index = JSON.parse(text(await verified(meta.assetIndex.url, meta.assetIndex.sha1, `index-${meta.assetIndex.id}.json`)));
  const soundsObject = index.objects['minecraft/sounds.json'];
  if (!soundsObject) throw Error(`${id}: asset index has no minecraft/sounds.json`);
  const soundsUrl = `https://resources.download.minecraft.net/${soundsObject.hash.slice(0, 2)}/${soundsObject.hash}`;
  const soundDefs = JSON.parse(text(await verified(soundsUrl, soundsObject.hash, 'sounds.json')));
  const files = unzipSync(jar, { filter: f => f.name === 'version.json' || /^assets\/minecraft\/(blockstates\/|models\/|textures\/block\/|lang\/en_us\.json$)/.test(f.name) || /^assets\/minecraft\/textures\/.*\.png(\.mcmeta)?$/.test(f.name) });
  const versionJson = files['version.json'] && JSON.parse(text(files['version.json']));
  const pv = versionJson?.pack_version;
  const format = pv == null ? null : typeof pv === 'number' ? [pv, 0] : pv.resource_major != null ? [pv.resource_major, pv.resource_minor ?? 0] : pv.resource != null ? [pv.resource, 0] : null;
  if (!format) throw Error(`${id}: version.json does not declare a resource pack format; this generator does not infer one.`);
  const lang = files['assets/minecraft/lang/en_us.json'] ? JSON.parse(text(files['assets/minecraft/lang/en_us.json'])) : {};
  const norm = ref => ref.replace(/^minecraft:/, '');
  const model = ref => { const f = files[`assets/minecraft/models/${norm(ref)}.json`]; return f ? JSON.parse(text(f)) : null; };
  const modelCache = new Map();
  function modelTextures(ref) {
    if (modelCache.has(ref)) return modelCache.get(ref);
    const chain = []; let r = norm(ref);
    while (r && chain.length < 40) { const m = model(r); if (!m) break; chain.push(m); r = m.parent ? norm(m.parent) : null; }
    const textures = {}; for (const m of [...chain].reverse()) Object.assign(textures, m.textures ?? {});
    const elements = chain.find(m => Array.isArray(m.elements))?.elements ?? [];
    const used = new Map();
    for (const el of elements) for (const face of Object.values(el.faces ?? {})) {
      // Texture values are strings, or {sprite, force_translucent} objects in newer formats.
      const sprite = v => (v && typeof v === 'object' ? v.sprite : v);
      let t = sprite(face.texture), variable = null;
      for (let i = 0; i < 20 && typeof t === 'string' && t.startsWith('#'); i++) { variable = t.slice(1); t = sprite(textures[variable]); }
      if (typeof t !== 'string' || t.startsWith('#')) continue;
      const path = `textures/${norm(t)}.png`;
      if (!used.has(path)) used.set(path, new Set());
      if (variable) used.get(path).add(variable);
    }
    modelCache.set(ref, used); return used;
  }
  const blocks = [];
  const blockIds = Object.keys(files).filter(n => n.startsWith('assets/minecraft/blockstates/') && n.endsWith('.json')).map(n => n.slice(29, -5)).sort();
  for (const blockId of blockIds) {
    const state = JSON.parse(text(files[`assets/minecraft/blockstates/${blockId}.json`]));
    const refs = new Set();
    const add = v => { for (const m of Array.isArray(v) ? v : [v]) if (m?.model) refs.add(m.model); };
    for (const v of Object.values(state.variants ?? {})) add(v);
    for (const part of state.multipart ?? []) add(part.apply);
    const used = new Map();
    for (const ref of refs) for (const [path, vars] of modelTextures(ref)) { if (!used.has(path)) used.set(path, new Set()); for (const v of vars) used.get(path).add(v); }
    const name = lang[`block.minecraft.${blockId}`] ?? humanize(blockId);
    const slots = [];
    for (const [path, vars] of [...used].sort(([a], [b]) => a.localeCompare(b))) {
      const png = files[`assets/minecraft/${path}`];
      if (!png) continue;
      const file = path.split('/').at(-1).slice(0, -4);
      const faces = [...vars].filter(v => v !== 'particle').sort();
      const label = file.startsWith(`${blockId}_`) ? humanize(file.slice(blockId.length + 1)).toLowerCase() : file === blockId ? (faces.join(', ') || 'all') : humanize(file).toLowerCase();
      const slot = { path, label, faces };
      const size = pngSize(png);
      const mcmeta = files[`assets/minecraft/${path}.mcmeta`];
      if (mcmeta && JSON.parse(text(mcmeta)).animation) slot.unavailable = 'animated';
      else if (!size || size.width !== size.height) slot.unavailable = 'nonSquare';
      slot.preview = await writePreview(png);
      slots.push(slot);
    }
    blocks.push(slots.length ? { id: blockId, name, slots } : { id: blockId, name, slots: [], unavailable: 'special' });
  }
  const sounds = Object.entries(soundDefs).sort(([a], [b]) => a.localeCompare(b)).map(([event, def]) => {
    const parts = event.split('.');
    const subtitle = typeof def.subtitle === 'string' ? def.subtitle : undefined;
    let name;
    if (subtitle === `subtitles.${event}` && lang[subtitle]) name = lang[subtitle];
    else if (parts.length >= 3) name = `${lang[`${parts[0]}.minecraft.${parts[1]}`] ?? humanize(parts[1])} - ${humanize(parts.slice(2).join(' ')).toLowerCase()}`;
    else name = `${humanize(parts[0])} - ${humanize(parts.slice(1).join(' ')).toLowerCase()}`;
    const clips = (def.sounds ?? []).map(s => typeof s === 'string' ? { name: s } : s);
    const attenuations = new Set(clips.map(c => c.attenuation_distance));
    const out = { event, name, category: SOUND_CATEGORY[parts[0]] ?? humanize(parts[0]), clips: clips.length };
    if (subtitle) out.subtitle = subtitle;
    if (clips.some(c => c.stream)) out.stream = true;
    if (attenuations.size === 1 && [...attenuations][0] != null) out.attenuation = [...attenuations][0];
    return out;
  });
  const catalog = await saveCatalog('java', { schema: 1, edition: 'java', blocks, sounds });
  const slots = blocks.flatMap(b => b.slots);
  await saveProfile({
    edition: 'java', version: id, label: `Java ${id}`, order: entry.releaseTime, releaseTime: entry.releaseTime, catalog,
    java: { resourceFormat: format },
    sources: { manifestUrl: MANIFEST, metadataUrl: entry.url, metadataSha1: entry.sha1, clientUrl: client.url, clientSha1: client.sha1, assetIndexUrl: meta.assetIndex.url, assetIndexSha1: meta.assetIndex.sha1, soundsUrl, soundsSha1: soundsObject.hash },
    counts: { blocks: blocks.length, slots: slots.length, editableSlots: slots.filter(s => !s.unavailable).length, sounds: sounds.length },
    verification: 'source-generated',
  });
  return `${id}: format ${format.join('.')}, ${blocks.length} blocks, ${slots.length} slots (${slots.filter(s => !s.unavailable).length} editable), ${sounds.length} sound events`;
}

// ---------------------------------------------------------------- Bedrock
async function buildBedrock(tag) {
  const api = `https://api.github.com/repos/${SAMPLES}`;
  const commit = JSON.parse(text(await download(`${api}/commits/${encodeURIComponent(tag)}`))).sha;
  const tree = JSON.parse(text(await download(`${api}/git/trees/${commit}?recursive=1`)));
  if (tree.truncated) throw Error('Git tree listing is truncated.');
  const blobs = new Map(tree.tree.filter(t => t.type === 'blob').map(t => [t.path, t.sha]));
  const raw = path => `https://raw.githubusercontent.com/${SAMPLES}/${commit}/${path}`;
  const get = async path => { const sha = blobs.get(path); if (!sha) return null; return cachedBlob(raw(path), sha); };
  const sampleVersion = JSON.parse(text(await get('version.json'))).latest.version;
  if (tag.replace(/^v/, '') !== sampleVersion) throw Error(`${tag}: version.json reports ${sampleVersion}`);
  const parts = sampleVersion.split('.').map(Number);
  const version = parts[1] >= 26 ? `${parts[1]}.${parts[2]}` : parts.slice(0, 3).join('.');
  const blocksJson = parseCommentedJson(text(await get('resource_pack/blocks.json')));
  const terrain = parseCommentedJson(text(await get('resource_pack/textures/terrain_texture.json'))).texture_data;
  const flipbook = new Set((parseCommentedJson(text(await get('resource_pack/textures/flipbook_textures.json') ?? new TextEncoder().encode('[]')))).map(f => f.flipbook_texture));
  const langBytes = await get('resource_pack/texts/en_US.lang');
  const lang = Object.fromEntries((langBytes ? text(langBytes) : '').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).split('\t')[0].replace(/#.*$/, '').trim()]; }));
  const registryBytes = await get('metadata/vanilladata_modules/mojang-blocks.json');
  const registry = registryBytes ? JSON.parse(text(registryBytes)).data_items.map(x => ({ id: x.name.replace(/^minecraft:/, ''), serialization: x.serialization_id })) : Object.keys(blocksJson).filter(k => k !== 'format_version').map(id => ({ id }));
  const entryFor = b => blocksJson[b.id] ?? (b.serialization ? blocksJson[b.serialization.replace(/^tile\./, '')] : undefined);
  const keyPaths = key => { const t = terrain[key]?.textures; const list = t == null ? [] : Array.isArray(t) ? t : [t]; return [...new Set(list.map(x => typeof x === 'string' ? x : x?.path).filter(Boolean))]; };
  const keyUsers = new Map();
  const keysOf = entry => { const t = entry?.textures; if (!t) return []; return typeof t === 'string' ? [['all', t]] : Object.entries(t); };
  for (const b of registry) for (const [, key] of keysOf(entryFor(b))) { if (!keyUsers.has(key)) keyUsers.set(key, new Set()); keyUsers.get(key).add(b.id); }
  const fileInfo = new Map();
  const allPaths = new Set();
  for (const b of registry) for (const [, key] of keysOf(entryFor(b))) for (const p of keyPaths(key)) allPaths.add(p);
  await pool([...allPaths], 16, async p => {
    const ext = blobs.has(`resource_pack/${p}.png`) ? 'png' : blobs.has(`resource_pack/${p}.tga`) ? 'tga' : null;
    if (!ext) return;
    const bytes = await get(`resource_pack/${p}.${ext}`);
    const size = ext === 'png' ? pngSize(bytes) : tgaSize(bytes);
    const png = !size ? null : ext === 'png' ? bytes : tgaToPng(bytes);
    fileInfo.set(p, { ext, size, preview: png ? await writePreview(png) : undefined });
  });
  const blocks = registry.map(b => {
    const entry = entryFor(b);
    const name = lang[`${b.serialization ?? `tile.${b.id}`}.name`] ?? lang[`tile.${b.id}.name`] ?? humanize(b.id);
    const byPath = new Map(); const blocked = [];
    for (const [face, key] of keysOf(entry)) {
      const paths = keyPaths(key);
      if (paths.length > 1 && keyUsers.get(key).size > 1) { blocked.push({ face, key }); continue; }
      for (const p of paths) { if (!byPath.has(p)) byPath.set(p, { faces: new Set(), multi: paths.length > 1 }); byPath.get(p).faces.add(face); }
    }
    const slots = [];
    for (const [p, info] of [...byPath].sort(([x], [y]) => x.localeCompare(y))) {
      const file = fileInfo.get(p);
      const faces = [...info.faces].sort();
      const fileName = p.split('/').at(-1);
      const slot = { path: `${p}.png`, label: info.multi ? humanize(fileName).toLowerCase() : faces.includes('all') ? 'all' : faces.join(', '), faces };
      if (!file) slot.unavailable = 'missing';
      else if (flipbook.has(p)) slot.unavailable = 'animated';
      else if (!file.size || file.size.width !== file.size.height) slot.unavailable = 'nonSquare';
      if (file?.ext === 'tga') slot.vanillaFormat = 'tga';
      if (file?.preview) slot.preview = file.preview;
      slots.push(slot);
    }
    for (const { face, key } of [...new Map(blocked.map(x => [x.key, x])).values()]) slots.push({ path: `unavailable:${key}`, label: `${face} (${key})`, faces: [face], unavailable: 'sharedVariant' });
    const out = { id: b.id, name, slots };
    if (!entry?.textures) out.unavailable = 'missing';
    return out;
  }).sort((a, b) => a.id.localeCompare(b.id));
  const defsFile = parseCommentedJson(text(await get('resource_pack/sounds/sound_definitions.json')));
  const defs = defsFile.sound_definitions ?? defsFile;
  const sounds = Object.entries(defs).filter(([k]) => k !== 'format_version').sort(([a], [b]) => a.localeCompare(b)).map(([event, def]) => ({ event, name: humanize(event), category: humanize(def.category ?? 'other'), clips: (def.sounds ?? []).length }));
  const catalog = await saveCatalog('bedrock', { schema: 1, edition: 'bedrock', blocks, sounds });
  const slots = blocks.flatMap(b => b.slots);
  await saveProfile({
    edition: 'bedrock', version, label: `Bedrock ${version}`, order: parts.map(n => String(n).padStart(4, '0')).join('.'), catalog,
    bedrock: { sampleVersion, engineVersion: parts.slice(0, 3) },
    sources: { repositoryUrl: `https://github.com/${SAMPLES}/tree/${commit}`, tag, commit, blocksSource: registryBytes ? 'metadata/vanilladata_modules/mojang-blocks.json + resource_pack/blocks.json' : 'resource_pack/blocks.json' },
    counts: { blocks: blocks.length, slots: slots.length, editableSlots: slots.filter(s => !s.unavailable).length, sounds: sounds.length },
    verification: 'source-generated',
  });
  return `${version} (${tag} @ ${commit.slice(0, 7)}): ${blocks.length} blocks, ${slots.length} slots (${slots.filter(s => !s.unavailable).length} editable), ${sounds.length} sound events`;
}

const [edition, ...targets] = process.argv.slice(2);
if (!['java', 'bedrock'].includes(edition) || !targets.length) { console.error('Usage: node scripts/build-catalog.mjs <java|bedrock> <version|tag>...'); process.exit(2); }
const manifest = edition === 'java' ? JSON.parse(text(await download(MANIFEST))) : null;
for (const target of targets) console.log(edition === 'java' ? await buildJava(target, manifest) : await buildBedrock(target));
