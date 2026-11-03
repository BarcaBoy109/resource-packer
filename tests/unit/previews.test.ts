import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { loadCatalog, profiles } from '../../src/catalog';
import { blankProject } from '../../src/domain';
import { buildPack } from '../../src/exporters';

const dir = new URL('../../public/previews/sha/', import.meta.url);

describe('vanilla reference images', () => {
  it('ships an intact, content-addressed PNG for every referenced preview, with no orphans', async () => {
    const referenced = new Set<string>();
    for (const p of profiles) for (const a of await loadCatalog(p.edition, p.version)) if (a.preview) referenced.add(a.preview);
    const files = readdirSync(dir).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4));
    expect(new Set(files)).toEqual(referenced);
    for (const id of referenced) {
      const png = readFileSync(new URL(`${id}.png`, dir));
      expect(png.subarray(0, 8).toString('hex'), id).toBe('89504e470d0a1a0a');
      expect(createHash('sha256').update(png).digest('hex').slice(0, 20), id).toBe(id);
    }
  });

  it('keeps vanilla preview assets out of both exported pack formats', async () => {
    const bytes = new Uint8Array(33);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    new DataView(bytes.buffer).setUint32(16, 16);
    new DataView(bytes.buffer).setUint32(20, 16);
    for (const edition of ['java', 'bedrock'] as const) {
      const project = blankProject(edition);
      const slot = edition === 'java' ? 'textures/block/stone.png' : 'textures/blocks/stone.png';
      project.edits = [{ target: 'stone', slot, fileName: 'original-test.png', bytes: bytes.buffer, type: 'image/png', valid: true, message: 'Original synthetic header' }];
      const archive = unzipSync(await buildPack(project));
      expect(Object.keys(archive).sort()).toEqual((edition === 'java' ? ['pack.mcmeta', 'assets/minecraft/textures/block/stone.png'] : ['manifest.json', 'textures/blocks/stone.png']).sort());
      expect(archive[edition === 'java' ? `assets/minecraft/${slot}` : slot]).toEqual(bytes);
    }
  });
});
