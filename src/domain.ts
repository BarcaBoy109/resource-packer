import { latestVersion } from './catalog';

export type Edition = 'java' | 'bedrock';
/** One editable texture slot or sound event from a generated, version-specific catalog. */
export type Asset = {
  id: string; name: string; kind: 'texture' | 'sound'; path: string; category: string;
  event?: string; faces?: string[]; shared?: string[]; codec?: string;
  /** Content-addressed vanilla reference image in public/previews/sha/. */
  preview?: string;
  /** When set, the entry is listed for completeness but cannot be replaced. */
  unavailable?: string;
  /** Bedrock texture stored as TGA in the vanilla pack; replacements are written as PNG. */
  vanillaFormat?: string;
  subtitle?: string; stream?: boolean; attenuation?: number; clips?: number; mono?: boolean;
};
export type Edit = { target: string; slot?: string; fileName: string; bytes: ArrayBuffer; type: string; valid: boolean; message: string };
export type Project = { schema: 1; id: string; edition: Edition; gameVersion: string; name: string; description: string; packVersion: [number, number, number]; headerUuid: string; moduleUuid: string; edits: Edit[]; packIcon?: { fileName: string; bytes: ArrayBuffer }; updated: number };

export function blankProject(edition: Edition = 'java', version = latestVersion(edition)): Project {
  return { schema: 1, id: crypto.randomUUID(), edition, gameVersion: version, name: 'My Resource Pack', description: 'A custom resource pack', packVersion: [1, 0, 0], headerUuid: crypto.randomUUID(), moduleUuid: crypto.randomUUID(), edits: [], updated: Date.now() };
}
