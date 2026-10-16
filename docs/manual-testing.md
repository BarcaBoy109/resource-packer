# Manual Minecraft smoke tests

Status: all items are pending. Minecraft was not launched as part of implementation; generated archives are structurally inspected in automated tests only.

## Java 26.3

- [ ] Open the game’s Options → Resource Packs → Open Pack Folder and copy in the generated ZIP.
- [ ] Confirm the pack is listed with the supplied pack name and description.
- [ ] Enable it and inspect stone, oak log side/top, and any other changed textures in a test world.
- [ ] Trigger each selected sound event and confirm each custom sound is heard and old random variants are not still selected.
- [ ] Check the resource-pack warning/compatibility display and game log for metadata or path errors.

## Bedrock 26.50

- [ ] Open the generated MCPACK to import it; activate it in global resources or the test world.
- [ ] Confirm it is listed and inspect changed textures in a test world.
- [ ] Exported Bedrock sound changes are intentionally blocked pending source mapping, so do not count sound replacement as tested.
- [ ] Re-export changed content and verify a version update is recognized by the game.
- [ ] Check pack recognition and game logs for manifest/path errors.

Record device/platform, exact game build, archive SHA-256, observed results, and relevant log output before changing a target to `game-tested`.
