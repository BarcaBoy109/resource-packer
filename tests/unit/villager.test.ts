import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {strFromU8,unzipSync} from 'fflate';
import {blankProject,catalog} from '../../src/domain';
import {buildPack} from '../../src/exporters';

it('replaces the entire idle pool without overriding villager agreement',async()=>{
  const asset=catalog('java').find(a=>a.name==='Villager idle noises')!;
  const bytes=new Uint8Array(readFileSync('tests/fixtures/generated-tone.ogg'));
  const project=blankProject();
  project.edits=[{target:asset.id,slot:asset.path,fileName:'idle.ogg',bytes:bytes.buffer,type:'audio/ogg',valid:true,message:'Ogg Vorbis'}];
  const files=unzipSync(await buildPack(project));
  const sounds=JSON.parse(strFromU8(files['assets/minecraft/sounds.json']));
  expect(Object.keys(sounds)).toEqual(['entity.villager.ambient']);
  expect(sounds['entity.villager.ambient'].replace).toBe(true);
  const clips=sounds['entity.villager.ambient'].sounds;
  expect(clips).toHaveLength(1);
  expect(files[`assets/minecraft/sounds/${clips[0].name}.ogg`]).toEqual(bytes);
  expect(catalog('bedrock').some(a=>a.id===asset.id)).toBe(false);
});
