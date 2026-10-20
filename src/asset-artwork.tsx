import { useState } from 'react';
import { previewCatalog } from './catalog-previews';
import type { Asset, Edition } from './domain';

export function SpeakerIcon({ className = '' }: { className?: string }) {
  return <svg className={`speaker-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M10.5 5.5 5.8 9H3v6h2.8l4.7 3.5z" />
    <path d="M14.5 8.5a5 5 0 0 1 0 7M17.5 5.5a9 9 0 0 1 0 13" />
  </svg>;
}

function MissingTextureIcon() {
  return <svg className="missing-texture-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="m5 16 4-4 4 4 3-3 3 3M8 8h2" />
  </svg>;
}

/** Preview metadata is independent of the project and the archive's export paths. */
export function AssetArtwork({ asset, edition, gameVersion, className = '' }: {
  asset: Asset; edition: Edition; gameVersion: string; className?: string;
}) {
  const [failedSource, setFailedSource] = useState('');
  if (asset.kind === 'sound') {
    return <span className={`asset-artwork sound-artwork ${className}`} aria-hidden="true"><SpeakerIcon /></span>;
  }
  const preview = previewCatalog.textures.find(p => p.edition === edition && p.gameVersion === gameVersion && p.path === asset.path);
  const available = preview && failedSource !== preview.src;
  return <span className={`asset-artwork texture-artwork ${className}`} role={available ? undefined : 'img'} aria-label={available ? undefined : 'Texture preview unavailable'} title={available ? 'Vanilla texture reference. In-game tint and lighting vary.' : 'Texture preview unavailable'}>
    {available ? <img src={preview.src} width={preview.width} height={preview.height} alt={`${asset.name} vanilla texture`} decoding="async" onError={() => setFailedSource(preview.src)} /> : <MissingTextureIcon />}
  </span>;
}
