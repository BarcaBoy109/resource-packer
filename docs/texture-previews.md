# Vanilla texture references

The catalog and empty texture editor show actual vanilla texture files, rendered
with nearest-neighbor scaling. The 62 checked-in references cover 40 Java texture
slots and 22 Bedrock slots, including distinct log sides and tops. The newly added
Java yellow poplar leaves slot has no bundled preview yet; it displays the explicit
unavailable-image fallback until the pinned asset refresh can run. These images are
UI references only: exporters and project backups still contain only user uploads
and required metadata. The source archive is never saved to this repository.

## Pinned sources

- Java 26.3: [official version metadata](https://piston-meta.mojang.com/v1/packages/61fff1316bd50312624a858bbb5eb18fa45208ed/26.3.json), metadata SHA-1 `61fff1316bd50312624a858bbb5eb18fa45208ed`.
- Java client: [official client archive](https://piston-data.mojang.com/v1/objects/e877b6a07acd633fb3bb475002175cec036e7b87/client.jar), SHA-1 `e877b6a07acd633fb3bb475002175cec036e7b87`. The sync script verifies this hash and extracts only the catalog PNG entries.
- Bedrock 26.50: [Mojang sample 1.26.50.4](https://github.com/Mojang/bedrock-samples/tree/46ba6ea985fb5a92d79a9419198f10dda14c199d/resource_pack), revision `46ba6ea985fb5a92d79a9419198f10dda14c199d`.

`src/catalog-previews.ts` records every local URL, original source path/URL,
dimensions, and SHA-256 hash. Preview paths are separate from export destinations.
No uploaded filename or user input selects a hosted image path.

Bedrock grass and oak leaves use the official `grass_side_carried.png` and
`leaves_oak_opaque.png` display variants because the sample base files use TGA.
Oak door and furnace references come from `door_wood_lower.png` and
`furnace_front_off.png`. These display aliases do not certify the existing export
mappings; the compatibility guide's mapping-audit limitations still apply.
Raw texture files do not reproduce biome tint, lighting, models, or transparency
as seen in game. The editor calls them vanilla references, not in-game renders.

## Attribution and use

The images remain © Mojang AB / Microsoft, all rights reserved. They are not
permissively licensed project artwork. The [sample license](https://github.com/Mojang/bedrock-samples/blob/46ba6ea985fb5a92d79a9419198f10dda14c199d/LICENSE.md)
reserves all rights and refers to the Minecraft EULA. The intended use is limited
reference display in this Minecraft community editor, following the domain
names/websites and essential guidance in the [usage guidelines](https://www.minecraft.net/en-us/usage-guidelines),
reviewed 2026-10-21. This is not a claim of a general redistribution license.

The footer retains a prominent non-affiliation notice and links to
`public/previews/NOTICE.txt`. These assets must not be reused as app branding or
included in generated resource packs.

## Refresh and verification

Run `node --experimental-strip-types scripts/sync-previews.mjs` with Node 22+
and network access to reproduce the files from the pinned sources. It runs
manually, never during build, export, or ordinary app use. Runtime previews are
local static files and work without contacting Mojang or GitHub. Failed images
show an explicit unavailable fallback while upload controls remain available.

Unit coverage checks file signatures, dimensions, hashes, source hosts, every
bundled preview, the declared pending-preview exception, and exported archive contents. Browser coverage checks actual
image loading, distinct log faces, missing-image fallback, sound SVGs, and mobile
overflow, alongside the existing upload/backup/download flows. Minecraft game
tests remain pending; these visual references introduce no compatibility claim.
