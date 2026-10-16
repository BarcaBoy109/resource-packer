# Resource Packer

A local browser app for assembling Minecraft resource packs. Drafts and uploaded files stay in browser IndexedDB; no backend is used.

## Run locally

Requires Node.js 22.15+ and npm.

```sh
npm install
npm run dev
```

Open the URL Vite prints. Automated checks:

```sh
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run preview
```

The browser tests use Playwright Chromium. Install it once with `npx playwright install chromium` if it is not present.

## Current boundaries

- Targets: Java 26.3 and Bedrock 26.50; see [compatibility record](docs/compatibility.md) for exact source and verification status.
- Java ZIPs include texture replacements, pack metadata, optional icon, and Java sound-event overrides.
- Bedrock MCPACK/ZIP exports include texture replacements, a manifest, and optional pack icon. Bedrock sound export stays blocked pending exact release event/path verification.
- Output archives have automated structural checks; Minecraft in-game testing is pending for both targets. The hand-test list is in [manual testing](docs/manual-testing.md).
- Current curated catalog: 20 block IDs (22 texture slots including two log tops) and 12 sound IDs per edition. Individual release paths still need a source audit before broad compatibility claims.

Minecraft is a trademark of Mojang Studios. Resource Packer is not affiliated with Mojang or Microsoft.
