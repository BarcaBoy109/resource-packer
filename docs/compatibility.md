# Compatibility and catalog record

Baseline reviewed 2026-10-13. “Source-backed version metadata” means the release and pack-format facts below are supported by the cited primary source. It does **not** claim every hand-curated asset path has been audited from the release files or that the archive works in game. Export status in this app is structural only.

## Targets

| Edition | Selected target | Version source | Pack metadata source | State |
|---|---|---|---|---|
| Java | 26.3 | [Official Java 26.3 release notes](https://feedback.minecraft.net/hc/en-us/articles/48913133328013-Minecraft-Java-Edition-26-3) | Resource Pack format 97.1 in the same release notes; [1.21.9 metadata change notes](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-9) require `min_format` and `max_format` | Metadata source-checked; file mappings and in-game behavior pending |
| Bedrock | 26.50 | [Mojang sample revision 1.26.50.4, commit 46ba6ea](https://github.com/Mojang/bedrock-samples/commit/46ba6ea); official sample `version.json` records 1.26.50.4 dated 2026-09-15 | [Bedrock manifest reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable) | Version/sample source checked; mappings and in-game behavior pending |

Bedrock 26.52 is not offered: its release is confirmed by the [official 26.52 hotfix notes](https://feedback.minecraft.net/hc/en-us/articles/49175370527501-Minecraft-Bedrock-Edition-26-52-Hotfix-Changelog), but a matching 26.52 Mojang sample revision was not available in this review. Java 26.2 and 1.21.11 are not offered as separate profiles in this first build.

The current app catalog contains 35 Java block IDs (41 editable texture slots, including Oak, Birch, Poplar, and Stripped Poplar log tops/sides), 42 Java sound events, 20 Bedrock block IDs (22 editable texture slots), and 12 legacy Bedrock sound IDs hidden from editing. The Java-only texture additions in the 2026-10-21 expansion are enumerated by Mojang in the [26.3 release notes](https://feedback.minecraft.net/hc/en-us/articles/48913133328013-Minecraft-Java-Edition-26-3); their filenames and event identifiers are recorded with that source in `src/domain.ts`. Sound uploads replace the selected event with one custom clip; the custom archive path is derived from the event identifier and is not a claim about the vanilla clip filename. Bedrock has not been expanded because its source texture registry alone does not verify every block-to-slot relationship, and its sound exporter is still blocked. The earlier hand-curated mappings are not exhaustively verified.

## Java villager event verification (2026-10-21)

“Villager idle noises” overrides `entity.villager.ambient`, replacing its full three-clip idle pool. “Villager agrees” independently overrides `entity.villager.yes`. The archive uses its own clip paths referenced by `sounds.json`; those paths do not need to match vanilla clip filenames.

Verified against Mojang's [26.3 version metadata](https://piston-meta.mojang.com/v1/packages/61fff1316bd50312624a858bbb5eb18fa45208ed/26.3.json), [asset index 34](https://piston-meta.mojang.com/v1/packages/0c8f43b28f837869c1e54a6aeb22c396a1548946/34.json), and [sounds.json](https://resources.download.minecraft.net/79/7975165ad4a3c0cb3c05078b914eac0f2c3b5f5f). Their pinned SHA-1 hashes are encoded in these URLs. Vanilla ambient references are `mob/villager/idle1`, `idle2`, and `idle3`; agreement references are `mob/villager/yes1`, `yes2`, and `yes3`.

The user reports agreement replacement works in Java 26.3. Idle replacement still needs an in-game smoke test: enable the exported ZIP, reload resources, and run `/playsound minecraft:entity.villager.ambient master @s ~ ~ ~ 1 1`, then listen near villagers. Test agreement separately to confirm it remains unchanged unless explicitly replaced.

## Mapping and behavior gaps

- Java paths are a manually curated mapping in `src/domain.ts`. The new Java 26.3 texture filenames and event identifiers are source-checked against Mojang release notes; legacy mappings still need a complete client asset-index audit. Java sound events are assembled into an overriding `sounds.json`, but replacement completeness and sound-pool behavior have not been checked against the exact 26.3 client.
- Bedrock texture paths are hand-curated and have not yet been compared entry-by-entry with `blocks.json` and `terrain_texture.json` at commit `46ba6ea`. Bedrock sound editing is hidden and sound export is blocked until exact release events and replacement paths are cataloged. Legacy sound edits are retained for explicit removal.
- Shared texture/sound reverse references are not exhaustive. Affected consumers are not currently shown, and a shared asset may affect more selections than the UI lists.
- Catalog items include cube faces and simple texture slots only. Models, animated textures, special renderers, and non-cube slot sets are excluded.
- A Bedrock manifest uses distinct project UUIDs, resources module type, and a conservative minimum engine version `[1, 20, 0]`. The game display version and engine version remain separate values.
- These are archive-structure checks, not game compatibility claims. No in-game smoke test was run for either target.

## Comparison against user-provided lists (2026-10-21)

- The [block-by-version list](https://minecraft.wiki/w/List_of_blocks_by_version) shows 90 Java block IDs introduced in 26.3 snapshots. The catalog now uses canonical IDs for 15 texture-backed Poplar, Shelf Mushroom, Red Shrub, and Straw Bed blocks and exposes 19 Mojang-listed texture slots for them. The remaining 75 IDs include wool/concrete stairs and slabs plus Poplar-derived block variants. These share texture references or need block-model checks, so they are not represented as independent replacement targets yet.
- [Crafty’s sound browser](https://crafty.gg/tools/sounds) labels its 1,838-event list as Minecraft 1.21.11, while this app targets 26.3. The catalog has 23 additional event IDs explicitly listed in Mojang’s 26.3 release notes. Remaining events need a comparison against the pinned 26.3 `sounds.json` before they can be enabled.
- The two lists help identify candidates, but neither establishes current 26.3 texture paths or sound definitions. No 26.3 compatibility is inferred from the 1.21.11 sound list.

## Follow-up catalog audit (2026-10-21)

Rechecked the final [Mojang Java 26.3 release notes](https://feedback.minecraft.net/hc/en-us/articles/48913133328013-Minecraft-Java-Edition-26-3) against `src/domain.ts`. Their Block Sprites section lists 19 texture paths and their Sounds section lists 23 new event IDs; all 42 source-listed entries are already present in the Java catalog. Those notes therefore provide no additional block texture paths or new sound events to add in this pass. They also list item, entity, and particle textures, which are outside this editor's block-texture scope.

The remaining block IDs from the version list require exact 26.3 block-model-to-texture mapping, and the 1.21.11 Crafty event list requires comparison with the pinned 26.3 sound definitions. The 26.3 client and sound-definition sources were not retrievable in this environment, so those candidates remain excluded rather than being added from unverified names or inferred paths.

## Player damage sound additions (2026-10-21)

Added Java events `entity.player.hurt`, `entity.player.hurt_drown`, `entity.player.hurt_freeze`, `entity.player.hurt_on_fire`, `entity.player.hurt_sweet_berry_bush`, and `entity.player.death`. Their event names, vanilla sound pools, and subtitles were checked in the version-pinned 26.3-snapshot-7 `sounds.json` at [MC Assets](https://mcasset.cloud/26.3-snapshot-7/assets/minecraft/sounds.json). This is a versioned third-party mirror, not a primary Mojang source. The primary Mojang 26.3 `sounds.json` object URL is recorded elsewhere in this document, but the local network could not fetch its contents; final-release payload comparison and in-game testing remain pending. The archive exporter only writes user-provided clips and event override entries; it does not package vanilla sounds.

Catalog counts are now 35 Java block IDs (41 texture slots) and 42 Java sound events. No additional old block IDs were added in this pass because the source audit must resolve their blockstate/model references to exact current texture slots before enabling replacements.

## Primary reference material

- [Mojang Java release manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json) (release selection source; exact client asset-index extraction remains pending).
- [Mojang Bedrock samples](https://github.com/Mojang/bedrock-samples) and the pinned sample commit above.
- [Bedrock resource pack manifest](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable).
- [Bedrock sounds and path overrides](https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomsounds?view=minecraft-bedrock-stable), [overwriting vanilla assets](https://learn.microsoft.com/en-us/minecraft/creator/documents/overwritingassets?view=minecraft-bedrock-stable).
- [Java usage guidelines](https://www.minecraft.net/en-us/usage-guidelines).


