import {openDB} from 'idb';import type {Project} from './domain';
const db=openDB('resource-packer',1,{upgrade(db){db.createObjectStore('projects');}});
let writeQueue=Promise.resolve();
export function save(p:Project){const snapshot=structuredClone(p);const write=writeQueue.catch(()=>undefined).then(async()=>{try{const d=await db;await d.put('projects',snapshot,snapshot.id);await d.put('projects',snapshot,'current');}catch(e){throw new Error(e instanceof DOMException&&e.name==='QuotaExceededError'?'Browser storage is full. Export a project backup and remove unused assets.':'Local draft storage is unavailable in this browser.',{cause:e});}});writeQueue=write;return write;}
export async function restore(id='current'){return (await db).get('projects',id) as Promise<Project|undefined>;}
export async function listDrafts(){const d=await db;const keys=await d.getAllKeys('projects');const result:Project[]=[];for(const key of keys)if(key!=='current'){const p=await d.get('projects',key) as Project|undefined;if(p)result.push(p);}return result;}

