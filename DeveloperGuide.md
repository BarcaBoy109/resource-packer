# Resource Packer developer guide

## Status and product direction

Planning baseline: 2026-10-13. The guide began as a planning document; the implementation outcome is recorded at the end. Treat the original acceptance criteria as the intended scope and consult the outcome section for what is actually implemented and which gaps remain.

The product makes Minecraft resource packs without requiring users to learn archive layouts or write JSON. Users choose Java or Bedrock, select a recent stable game version, replace block textures and in-game sounds, and download a usable pack.

The user explicitly selected recent stable versions of both editions over broad historical coverage. Exact launch versions remain to be verified from primary sources. The earlier research could not retrieve Mojang's live Java version manifest; no latest-version number should be inferred from that research.

## First iteration: a complete, bounded builder

The first iteration is a working vertical slice of the larger product. Prioritize correct outputs for a clearly labeled curated catalog over comprehensive coverage.

### Required scope

- Java and Bedrock edition selection.
- Target two recent stable releases per edition, using pinned source data. If a target cannot be substantiated, keep it out of the enabled selector and explain the catalog gap in this guide; never fabricate coverage to reach a count.
- A curated catalog targeting at least 20 ordinary blocks and 12 sound events per edition, where verified mappings permit. Include simple blocks, a log with separate top/side textures, and at least one block with multiple distinct faces. Include block interaction, entity, and ambient sounds. Record exact coverage.
- Search by friendly name and identifier, Blocks/Sounds tabs, category filtering, and a changed-assets filter.
- Texture slots with PNG upload, transparent/pixelated preview, dimension validation, replacement, and removal. Support multiple edits in one pack.
- Java sound uploads accept MP3 and Ogg Vorbis with codec validation, playback, duration/channel information, and meaningful errors. Per the 2026-10-20 user request, MP3 conversion is now in scope and Bedrock sound editing is hidden. MP3 clips up to 16 MiB and two minutes are decoded in-browser, downmixed to mono, and encoded to Vorbis in a lazily loaded worker. WAV and Ogg Opus remain unsupported.
- Pack name, description, and optional PNG icon; a replacement summary and actionable validation messages.
- Java ZIP export and Bedrock MCPACK plus ZIP export. Show appropriate installation instructions.
- Local draft autosave in IndexedDB, restoration after reload, and an editable project backup download/import containing metadata and uploaded assets. The project backup is distinct from the Minecraft pack.
- Safe target switching: clone the project, map verified compatible selections, and preserve unmapped edits as unresolved entries that block export until handled. Never silently discard edits or promise automatic cross-edition equivalence.
- A responsive, keyboard-accessible UI with useful empty, loading, success, and failure states.

### Deferred to subsequent iterations

WAV conversion, trimming and normalization, animated textures, arbitrary models and special block renderers, full vanilla catalogs, automated catalog regeneration, painting tools, shaders/PBR, item/entity texture editors, accounts, sharing, cloud persistence, and historical/snapshot/preview versions.

Do not show unsupported features as functioning controls. This first-iteration boundary is an implementation default for a small deliverable, not a change to the broader product direction.

## User flow and layout

1. Create or resume a local project.
2. Choose edition and an enabled exact version.
3. Search the catalog and select a block or sound.
4. Upload a replacement; see its preview, validation, and affected assets.
5. Review the pack's changes and resolve errors.
6. Download the pack and follow installation instructions.

On wide screens, use an asset browser, a main replacement editor, and a pack summary. Collapse these into clear panels on narrow screens. Use readable typography, restrained Minecraft-inspired styling, and original generic icons. Do not make the interface depend on hosting vanilla artwork or audio.

A texture preview represents the uploaded asset. Avoid claiming an exact in-game render, especially for tinting, lighting, overlays, and non-cube geometry. Clearly identify shared texture/sound effects before export.

## Technology and proposed layout

Use React + TypeScript + Vite, npm, fflate for asynchronous archives, IndexedDB (a small wrapper such as idb is acceptable), Vitest for logic tests, and Playwright for browser tests. Select compatible package versions during implementation and commit the lockfile. No OpenAI API, model integration, or account system belongs in the app.

```text
src/
  app/                 App shell and project orchestration
  components/          Accessible shared controls
  features/
    catalog/           Search, filters, and selection
    textures/          Slots, uploads, and previews
    sounds/            Upload validation and playback
    project/           Pack settings, changes, and target switching
    export/            Validation summary and download UI
  domain/              Shared types and pure project operations
  catalog/             Edition/version manifests and curated mappings
  exporters/           java.ts, bedrock.ts, archive.ts
  validation/          File, metadata, and project validators
  storage/             IndexedDB and backup format
tests/
  fixtures/            Original images/audio and expected pack metadata
  unit/
  e2e/
docs/
  compatibility.md     Sources, exact targets, coverage, verification
  manual-testing.md    Minecraft install and smoke-test procedure
```

Adjust the layout if a simpler structure improves clarity. Keep export and validation functions usable without mounting React.

## Data contracts

Define these concepts explicitly; exact TypeScript names are flexible:

- **Version profile:** edition, exact game version string, release channel, source URL/revision, catalog revision, metadata rules, and validation status. For Java, keep pack major/minor values as integer tuples where needed. For Bedrock, store the engine version separately from the public display version.
- **Catalog block:** stable internal ID, friendly name, game identifier, category, texture slots, supported profiles, source evidence, and related assets affected by replacement.
- **Catalog sound:** event identifier, friendly name, category, referenced clips/events, playback properties, shared references, supported profiles, and replacement strategy.
- **Project:** schema version, project ID, edition/profile ID, catalog revision, pack settings, stable Bedrock UUIDs, pack version, edits, and timestamps.
- **Replacement:** catalog ID and slot/event target, uploaded asset ID, validated metadata, and any explicit conversion/resize choices. Do not store browser object URLs as persistent data.
- **Asset blob:** original filename for display only, bytes, media type, dimensions or audio details, and content hash.
- **Export plan:** ordered output paths and bytes plus errors/warnings, generated by the selected edition adapter before archive construction.

Pin a project's catalog revision so future catalog updates cannot silently redirect existing edits. Import validation must reject unknown schema versions, missing assets, invalid references, and unsafe or excessive archive entries.

## Catalog sourcing and version support

For Java, use Mojang's launcher version metadata and the selected release's assets/resource metadata to establish file paths, models, blockstates, translations, and sound definitions. Client resources and asset-index resources may be separate. Keep any temporary downloaded game files outside committed source.

For Bedrock, use release-specific tags/commits of Mojang's sample resources, including `blocks.json`, `textures/terrain_texture.json`, and `sounds/sound_definitions.json`. Do not assume the current repository branch describes an older release. Some source files include comments; parse the actual source format deliberately.

Record evidence and exact mappings in `docs/compatibility.md`. A manually curated, sourced JSON catalog is acceptable for this iteration; a complete extraction pipeline is deferred. Generate a reverse-reference map so the UI can explain shared assets.

Use verification states such as `source-verified`, `archive-tested`, and `game-tested`; these are different claims. A stable release is not automatically a supported target. Unknown or unverified mappings must not be guessed from a neighboring version.

## Export behavior

### Java

- Put `pack.mcmeta` and optional `pack.png` at the root.
- Write replacement textures to profile-specific paths under `assets/minecraft/`.
- Select metadata syntax from the version profile. Modern format ranges and older `pack_format`/`supported_formats` rules differ; do not emit every field indiscriminately.
- For event replacement, use a verified `assets/minecraft/sounds.json` override with replacement semantics and collision-free custom audio paths. Preserve relevant subtitles and streaming behavior where appropriate. Resolve referenced events and demonstrate that old variants do not remain in the random pool.
- Output a ZIP whose contents can be placed directly in the Java resourcepacks folder through the game's Open Pack Folder workflow.

### Bedrock

- Put `manifest.json` and optional `pack_icon.png` at the root.
- Use a resources module, distinct persistent header/module UUIDs, a valid pack version, and the correct minimum engine version.
- Write textures to the selected profile's verified paths. Do not copy the complete vanilla terrain atlas definition as a starter pack.
- Prefer a verified event-definition override for isolated event replacement. If using vanilla file-path overrides, enumerate every affected variant and shared consumer, disclose the scope, and detect conflicts. Validate merging behavior in-game before claiming isolation.
- Keep MCPACK and ZIP contents equivalent. Explain importing MCPACK and activating it in Minecraft; for ZIP, explain extraction into the appropriate resource-pack location. Do not imply a raw Bedrock ZIP installs exactly like a Java ZIP.
- Preserve UUIDs on re-export. For changed content, bump the project pack version so Bedrock can recognize an update; avoid incrementing solely because an unchanged pack is downloaded again.

### Common validation

Inspect actual PNG/audio data; reject corrupted files, unsupported codecs, unreasonable decoded sizes, and invalid target dimensions. Use per-file and total-project limits defined in one configuration module and shown in the UI. Do not impose arbitrary square-only rules on targets that require another layout; unsupported layouts should be labeled explicitly.

For positional sounds, explain mono requirements and reject unsuitable stereo uploads for this iteration with conversion guidance. Music and non-positional sounds may use different rules. Validate channels from the audio format, not just HTML playback success.

Use catalog-controlled relative archive paths with forward slashes. Resolve conflicting writes before ZIP creation. Revoke unused object URLs, release resources after previews, handle storage quota errors, and bound backup decompression by entry count and uncompressed byte size. Empty projects and unresolved errors must not produce misleading successful exports.

## Implementation sequence

1. Inspect the environment; scaffold the app and test commands. Establish the version profiles and document source evidence.
2. Implement the project model, validators, curated catalogs, and pure exporters. Verify real archives for both editions before polishing UI.
3. Build the edition/version picker, searchable catalog, upload editors, settings, and export summary into one functioning flow.
4. Add IndexedDB persistence, project backup/import, safe target switching, and Bedrock update identity behavior.
5. Refine responsive styling, accessibility, errors, and installation help. Run automated checks and browser verification; perform available Minecraft smoke tests.
6. Update this guide with actual commands, exact coverage, implementation decisions, and pending manual checks.

Finish each step with usable evidence before expanding scope. If external metadata or tools are unavailable, continue independent work and record the specific gap without manufacturing success.

## Commands to establish

These commands do not exist until the application is scaffolded:

```text
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run preview
```

Use non-watch mode for automated unit tests. Document the chosen Node version and any Playwright browser installation required. Prefer repository-local dependencies to global installations.

## Definition of done

- A user can select a verified target in each edition, replace both a block texture and a sound, preview them, and download actual pack bytes.
- Archives pass independent content checks: root metadata, correct format fields, correct paths, valid JSON, valid PNG/Vorbis bytes, resolved sound references, no conflicting entries, and no unrelated vanilla assets.
- Multi-slot blocks, shared-asset warnings, malformed uploads, unsupported codecs, empty exports, unsafe backup paths, bounded import sizes, and incompatible target changes have meaningful test coverage.
- Draft restoration and editable backup round-trips retain files, selections, metadata, and Bedrock identity.
- Browser tests cover both editions through download; inspect at least one wide and one narrow layout and keyboard navigation.
- Type checking, linting, unit tests, end-to-end tests, and production build pass, or specific environmental blockers are reported with exact failed/unrun commands.
- In-game smoke tests check pack recognition, visible texture replacement, sound playback and replacement completeness, and Bedrock update import for each tested target. If the game is unavailable, leave an explicit pending checklist and do not label it game-tested. Implementation completion can be reported with this release-validation gap clearly separated.
- Setup instructions and compatibility status are current. There are no fake downloads, placeholder success states, or unsupported-version promises.

## Research references

Use these as starting points, not a substitute for checking the exact target release:

- Java metadata changes: https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-9
- Java release manifest: https://piston-meta.mojang.com/mc/game/version_manifest_v2.json
- Bedrock resource packs: https://learn.microsoft.com/en-us/minecraft/creator/documents/resourcepack?view=minecraft-bedrock-stable
- Bedrock manifest: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable
- Bedrock sound replacement: https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomsounds?view=minecraft-bedrock-stable
- Bedrock asset overrides: https://learn.microsoft.com/en-us/minecraft/creator/documents/overwritingassets?view=minecraft-bedrock-stable
- Bedrock file extensions: https://learn.microsoft.com/en-us/minecraft/creator/documents/minecraftfileextensions?view=minecraft-bedrock-stable
- Mojang sample resources: https://github.com/Mojang/bedrock-samples
- Sample asset license: https://github.com/Mojang/bedrock-samples/blob/main/LICENSE.md
- Java audio preparation (Fabric documentation; does not imply this app needs Fabric): https://docs.fabricmc.net/develop/sounds/custom
- Branding and asset usage: https://www.minecraft.net/en-us/usage-guidelines
- Vite: https://vite.dev/guide/
- ZIP processing: https://github.com/101arrowz/fflate
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Future audio conversion: https://ffmpegwasm.netlify.app/docs/overview/
- ffmpeg.wasm limitations: https://ffmpegwasm.netlify.app/docs/faq/

Use original test assets and generic catalog icons initially. Do not redistribute game files as part of exports or assume sample assets are MIT-licensed. Before adding hosted vanilla previews, establish a compliant sourcing approach. Include appropriate non-affiliation wording in the website, consistent with the usage guidelines.

## Implementation outcome (2026-10-14)

### Setup and commands

- Node.js 22.15.0, npm 10.9.2; React, strict TypeScript, Vite, fflate, idb, Vitest, ESLint flat config, and Playwright are in `package.json` with `package-lock.json`.
- Run `npm install`, `npm run dev`; verification commands are listed in `README.md`.
- Chromium was installed for Playwright. Minecraft itself was unavailable.

### Current implementation

- Enabled profiles: Java 26.3 (official Resource Pack format 97.1) and Bedrock 26.50 (Mojang sample 1.26.50.4, commit `46ba6ea`). These are separate display-version and metadata values. Bedrock 26.52 is excluded because a matching Mojang sample revision was not established.
- Catalog counts: 20 block IDs per edition, with oak and birch log top slots (22 texture slots total), and 12 sound IDs per edition across block interaction, entity, and ambient groups.
- Editor features: search, tabs, category and changed-only filters; PNG and Ogg/Vorbis upload validation; previews and playback; pack name/description/icon; replacement removal; Java ZIP, Bedrock MCPACK and ZIP exports; IndexedDB drafts; project backup/import; saved draft restoration; safe cross-edition cloning with unresolved edits; installation guidance.
- Java output uses `pack.mcmeta` format 97 with `min_format` and `max_format` `[97, 1]`, and Java event overrides. Bedrock output has root `manifest.json`, distinct UUIDs, and a resources module. Bedrock sound export is blocked until exact event references are confirmed.
- Limits are 16 MiB per replacement and 100 MiB total project asset data. Import preflights ZIP entry count and central-directory sizes before extraction.

### Verification and gaps

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run build` are the implemented commands. Final follow-up review results: typecheck passed, lint passed, unit tests passed (9), browser tests passed (7), and production build passed. Browser tests open both downloaded archive formats and check root metadata, paths, texture and sound bytes.
- Browser tests generate a 16×16 PNG in-browser. A 0.34-second mono 44.1 kHz sine-wave Ogg Vorbis fixture in `tests/fixtures/generated-tone.ogg` was generated with `@audio/encode-ogg` (MIT). This package is now a production dependency used only in the conversion worker. The Java browser test validates/decode-previews this file, backs it up and restores it, downloads the pack, and checks the Ogg bytes plus `sounds.json` reference.
- Follow-up regression coverage checks recent edits survive saved-draft switching during the autosave delay; malformed, unreferenced, metadata-invalid, and byte-invalid backup contents are rejected without replacing the current draft; Bedrock manifest version increments after metadata edits; replacement upload inputs are keyboard-focusable; and both editions' log-top paths have a single correct directory prefix.
- Java and Bedrock catalog paths still require entry-by-entry comparison with pinned release resources. Bedrock sound replacement remains blocked; shared-reference warnings and broad multi-slot edit coverage remain incomplete.
- No Minecraft smoke test was run. Both targets are `archive-tested` only where automated tests inspected the produced ZIP structure; neither is `game-tested`. Do not present a game-compatibility badge.

See `docs/compatibility.md` for source references and `docs/manual-testing.md` for the pending in-game checklist.

## MP3 and Bedrock UI update (2026-10-20)

- `src/sound-upload.ts` checks actual MPEG Layer III content, bounds input size/duration, decodes with Web Audio, and coordinates cancellation and timeouts.
- `src/vorbis.worker.ts` mixes stereo PCM to mono and encodes Vorbis at quality 5 using the locally bundled encoder. The worker is terminated after success, failure, or cancellation. No FFmpeg installation or special hosting headers are required.
- Converted edit bytes and MIME type are Ogg Vorbis; the original filename is retained only as a display label. Backup import still strictly validates Vorbis content, so no reconversion is needed.
- The app checks total project size using converted bytes and locks editing while processing. Cancelling preserves the current project.
- Bedrock only exposes Blocks. Older sound edits remain removable in the changes list and continue to block export until removed.
- The stereo MP3 fixture is an original one-second 440/660 Hz tone generated by `tests/fixtures/generate-mp3.mjs`. The MP3 encoder is test-only.
- Additional browser checks cover actual MP3 conversion and decoded output, backup/restoration, malformed input, cancellation, and hidden Bedrock sound controls.
- Verification: typecheck, lint, 12 unit tests, 11 browser tests, and production build passed. The built site was also served with Vite preview: MP3 conversion and Java ZIP download succeeded with no browser errors. Minecraft in-game verification remains pending.
