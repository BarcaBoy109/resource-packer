import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {strFromU8,unzipSync} from 'fflate';
import {blankProject} from '../../src/domain';
import {loadCatalog} from '../../src/catalog';
import {buildPack} from '../../src/exporters';

it('replaces the entire idle pool without overriding villager agreement',async()=>{
  const java=await loadCatalog('java','26.3');
  const asset=java.find(a=>a.event==='entity.villager.ambient')!;
  // Mojang 26.3 sounds.json lists three idle variants for this event.
  expect(asset.clips).toBe(3);
  const bytes=new Uint8Array(readFileSync('tests/fixtures/generated-tone.ogg'));
  const project=blankProject('java','26.3');
  project.edits=[{target:asset.id,slot:asset.path,fileName:'idle.ogg',bytes:bytes.buffer,type:'audio/ogg',valid:true,message:'Ogg Vorbis'}];
  const files=unzipSync(await buildPack(project));
  const sounds=JSON.parse(strFromU8(files['assets/minecraft/sounds.json']));
  expect(Object.keys(sounds)).toEqual(['entity.villager.ambient']);
  expect(sounds['entity.villager.ambient'].replace).toBe(true);
  expect(sounds['entity.villager.ambient'].subtitle).toBe('subtitles.entity.villager.ambient');
  const clips=sounds['entity.villager.ambient'].sounds;
  expect(clips).toHaveLength(1);
  expect(files[`assets/minecraft/sounds/${clips[0].name}.ogg`]).toEqual(bytes);
  expect((await loadCatalog('bedrock','26.60')).some(a=>a.id===asset.id)).toBe(false);
});
