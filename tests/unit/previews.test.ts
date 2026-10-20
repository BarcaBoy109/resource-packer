import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { previewCatalog } from '../../src/catalog-previews';
import { blankProject, catalog } from '../../src/domain';
import { buildPack } from '../../src/exporters';

describe('vanilla reference images', () => {
  it('ships an intact, source-pinned PNG for every editable texture slot in both editions', () => {
    for (const edition of ['java', 'bedrock'] as const) {
      const project = blankProject(edition);
      for (const asset of catalog(edition).filter(a => a.kind === 'texture')) {
        const matches = previewCatalog.textures.filter(p => p.edition === edition && p.gameVersion === project.gameVersion && p.path === asset.path);
        if (asset.previewState === 'pending') {
          expect(matches, `${edition}: ${asset.name} preview is explicitly pending`).toHaveLength(0);
          continue;
        }
        expect(matches, `${edition}: ${asset.name}`).toHaveLength(1);
        const preview = matches[0];
        const png = readFileSync(new URL(`../../public${preview.src}`, import.meta.url));
        expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(png.readUInt32BE(16)).toBe(preview.width);
        expect(png.readUInt32BE(20)).toBe(preview.height);
        expect(createHash('sha256').update(png).digest('hex')).toBe(preview.sha256);
        expect(preview.sourceUrl).toMatch(/^https:\/\/(piston-data\.mojang\.com|raw\.githubusercontent\.com\/Mojang\/bedrock-samples)\//);
      }
    }
  });

  it('keeps vanilla preview assets out of both exported pack formats', async () => {
    // An original synthetic texture header, independent of the vanilla previews.
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
