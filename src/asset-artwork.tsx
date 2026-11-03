import { useState } from 'react';
import type { Asset } from './domain';

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

export const previewSrc = (id: string) => `/previews/sha/${id}.png`;

/** Preview images are content-addressed UI references, independent of export paths. */
export function AssetArtwork({ asset, className = '' }: { asset: Asset; className?: string }) {
  const [failedSource, setFailedSource] = useState('');
  if (asset.kind === 'sound') {
    return <span className={`asset-artwork sound-artwork ${className}`} aria-hidden="true"><SpeakerIcon /></span>;
  }
  const src = asset.preview ? previewSrc(asset.preview) : '';
  const available = src && failedSource !== src;
  return <span className={`asset-artwork texture-artwork ${className}`} role={available ? undefined : 'img'} aria-label={available ? undefined : 'Texture preview unavailable'} title={available ? 'Vanilla texture reference. In-game tint and lighting vary.' : 'Texture preview unavailable'}>
    {available ? <img src={src} alt={`${asset.name} vanilla texture`} decoding="async" loading="lazy" onError={() => setFailedSource(src)} /> : <MissingTextureIcon />}
  </span>;
}
