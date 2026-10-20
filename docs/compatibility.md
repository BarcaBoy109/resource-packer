# Compatibility and catalog record

Baseline reviewed 2026-10-13. “Source-backed version metadata” means the release and pack-format facts below are supported by the cited primary source. It does **not** claim every hand-curated asset path has been audited from the release files or that the archive works in game. Export status in this app is structural only.

## Targets

| Edition | Selected target | Version source | Pack metadata source | State |
|---|---|---|---|---|
| Java | 26.3 | [Official Java 26.3 release notes](https://feedback.minecraft.net/hc/en-us/articles/48913133328013-Minecraft-Java-Edition-26-3) | Resource Pack format 97.1 in the same release notes; [1.21.9 metadata change notes](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-9) require `min_format` and `max_format` | Metadata source-checked; file mappings and in-game behavior pending |
| Bedrock | 26.50 | [Mojang sample revision 1.26.50.4, commit 46ba6ea](https://github.com/Mojang/bedrock-samples/commit/46ba6ea); official sample `version.json` records 1.26.50.4 dated 2026-09-15 | [Bedrock manifest reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable) | Version/sample source checked; mappings and in-game behavior pending |

Bedrock 26.52 is not offered: its release is confirmed by the [official 26.52 hotfix notes](https://feedback.minecraft.net/hc/en-us/articles/49175370527501-Minecraft-Bedrock-Edition-26-52-Hotfix-Changelog), but a matching 26.52 Mojang sample revision was not available in this review. Java 26.2 and 1.21.11 are not offered as separate profiles in this first build.

The current app catalog contains 20 block IDs (Oak log and Birch log each have a separately editable top slot), 13 Java sound IDs, and 12 legacy Bedrock sound IDs hidden from editing. It includes block interaction, entity, and ambient sound categories. These mappings have not all been exhaustively verified against release assets.

## Java villager event verification (2026-10-21)

“Villager idle noises” overrides `entity.villager.ambient`, replacing its full three-clip idle pool. “Villager agrees” independently overrides `entity.villager.yes`. The archive uses its own clip paths referenced by `sounds.json`; those paths do not need to match vanilla clip filenames.

Verified against Mojang's [26.3 version metadata](https://piston-meta.mojang.com/v1/packages/61fff1316bd50312624a858bbb5eb18fa45208ed/26.3.json), [asset index 34](https://piston-meta.mojang.com/v1/packages/0c8f43b28f837869c1e54a6aeb22c396a1548946/34.json), and [sounds.json](https://resources.download.minecraft.net/79/7975165ad4a3c0cb3c05078b914eac0f2c3b5f5f). Their pinned SHA-1 hashes are encoded in these URLs. Vanilla ambient references are `mob/villager/idle1`, `idle2`, and `idle3`; agreement references are `mob/villager/yes1`, `yes2`, and `yes3`.

The user reports agreement replacement works in Java 26.3. Idle replacement still needs an in-game smoke test: enable the exported ZIP, reload resources, and run `/playsound minecraft:entity.villager.ambient master @s ~ ~ ~ 1 1`, then listen near villagers. Test agreement separately to confirm it remains unchanged unless explicitly replaced.

## Mapping and behavior gaps

- Java paths are a manually curated mapping in `src/domain.ts`; a complete pinned Java client asset-index audit for every path is pending. Java sound events are assembled into an overriding `sounds.json`, but replacement completeness and sound-pool behavior have not been checked against the exact 26.3 client.
- Bedrock texture paths are hand-curated and have not yet been compared entry-by-entry with `blocks.json` and `terrain_texture.json` at commit `46ba6ea`. Bedrock sound editing is hidden and sound export is blocked until exact release events and replacement paths are cataloged. Legacy sound edits are retained for explicit removal.
- Shared texture/sound reverse references are not exhaustive. Affected consumers are not currently shown, and a shared asset may affect more selections than the UI lists.
- Catalog items include cube faces and simple texture slots only. Models, animated textures, special renderers, and non-cube slot sets are excluded.
- A Bedrock manifest uses distinct project UUIDs, resources module type, and a conservative minimum engine version `[1, 20, 0]`. The game display version and engine version remain separate values.
- These are archive-structure checks, not game compatibility claims. No in-game smoke test was run for either target.

## Primary reference material

- [Mojang Java release manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json) (release selection source; exact client asset-index extraction remains pending).
- [Mojang Bedrock samples](https://github.com/Mojang/bedrock-samples) and the pinned sample commit above.
- [Bedrock resource pack manifest](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable).
- [Bedrock sounds and path overrides](https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomsounds?view=minecraft-bedrock-stable), [overwriting vanilla assets](https://learn.microsoft.com/en-us/minecraft/creator/documents/overwritingassets?view=minecraft-bedrock-stable).
- [Java usage guidelines](https://www.minecraft.net/en-us/usage-guidelines).
