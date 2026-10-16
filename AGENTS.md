# Resource Packer: agent instructions

## Project purpose

Build a website that lets users choose a Minecraft edition and version, select existing blocks or in-game sounds, upload replacements, and download an installable resource pack. Support recent stable Java and Bedrock releases. Read `DeveloperGuide.md` before implementation; it defines the first iteration and acceptance criteria.

## Working rules

- Follow the user's current scope. A planning or documentation request does not authorize application implementation.
- For an implementation request, complete the working flow, verification, and documentation. Make routine reversible engineering decisions without repeatedly asking permission.
- Inspect existing files and preserve unrelated changes. Do not overwrite this guide or user work to simplify a task.
- Work in the current checkout. Do not create chats, spawn agents, deploy, publish, or push unless requested. These instructions do not request delegation.
- Keep progress updates concise. Report actual results and remaining limitations; never describe unrun tests as passing.
- Keep changes focused. Avoid authentication, a backend, cloud storage, or unrelated features in the first iteration.

## Architecture

- Use React, TypeScript with strict checking, and Vite; use npm and retain the lockfile.
- Keep edition/version catalogs, validation, project storage, and export logic separate from UI components.
- Implement Java and Bedrock as separate exporters over a shared typed project model.
- Generate archives locally with asynchronous ZIP processing. Keep uploaded images and audio on the user's device.
- Store drafts and binary assets in IndexedDB. Handle unavailable storage and quota failures explicitly.
- Prefer small modules and explicit data structures over a generic plugin framework.

## Minecraft correctness

- Never invent a version-to-pack-format mapping, asset path, sound event, or compatibility claim. Record primary-source URLs and pinned source revisions for catalog entries.
- Treat the game's display version, resource-pack format, Bedrock engine version, and project version as distinct values. Do not compare game versions as floating-point numbers.
- Only expose export targets backed by validated metadata and asset mappings. Track structural validation separately from actual in-game verification.
- Put `pack.mcmeta` or `manifest.json` at the archive root, without an extra parent directory.
- Export only replacements and required metadata/configuration, not an entire vanilla resource pack.
- Use catalog-controlled archive paths. Uploaded filenames must not determine paths. Reject traversal, absolute paths, and duplicate conflicting destinations.
- A block can reference multiple texture slots; assets and sounds can be shared. Show affected selections and reject conflicting replacements rather than silently picking a winner.
- Check file content and codec, not only extensions or browser MIME types. Never rename MP3/WAV/Opus data to `.ogg` and call it converted.
- Keep Bedrock header/module UUIDs distinct and stable within a project. Increment the pack version for changed re-exports intended as updates.
- Never silently remove replacements during edition/version changes. Preserve the original draft and explain incompatible mappings.

## User experience

- Deliver an accessible editor with real upload, preview, remove/reset, validation, and download behavior. No pretend download buttons or misleading compatibility badges.
- Use clear names such as "Oak log - top" and "Chest opens" alongside optional technical identifiers.
- Provide keyboard access, visible focus, labeled inputs, helpful empty/error states, and a usable narrow-screen layout.
- Keep export-format details in help/advanced views unless needed to explain a choice or error.
- Use original generic artwork or properly sourced previews. Do not assume Mojang's publicly available assets have a permissive redistribution license.

## Verification and handoff

- Establish `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run build` during scaffolding. Commands are planned until implemented.
- Test export artifacts independently by opening generated archives and inspecting entries, metadata, references, and bytes. Do not rely only on UI snapshots or tests that reproduce the implementation's constants.
- Cover both editions, invalid uploads, conflicts, version changes, persistence, and the upload-to-download flow.
- Use original generated test textures/audio with clear provenance. Do not commit downloaded game clients or full vanilla assets.
- Document in-game smoke-test steps and results per exact version. If Minecraft is unavailable, mark tests pending and label compatibility as structurally checked, not game-tested.
- At handoff, report implemented scope, commands run, supported target versions, unverified behavior, and how to run the app. Update `DeveloperGuide.md` to match reality.
