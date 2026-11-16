---
name: hls-conventions
description: "EXAMPLE. HLS output conventions for a transcode pipeline: rendition ladder, fMP4 (CMAF) segments, codec profile, keyframe cadence, playlist rules, ladder version, ffmpeg flag policy and the ffprobe/player checks that prove a video is valid. Load when changing the pipeline, the ladder, playlists, or evaluating transcode output."
---

<!-- Authored for this template. Apple and hls.js behaviour is stated from general knowledge and must be checked against current documentation (UNVERIFIED). No ecc content (ecc has no HLS skill). -->

# HLS conventions (example values: replace with yours)

Values live in **`{{LADDER_CONTRACT_PATH}}`** (a critical path, owned by the pipeline agent). This skill states the policy; never hardcode bitrates or flags in the pipeline, read the contract. Any bitrate figure you put in design docs is an assumption until eval-runner records real bytes per video into the run table.

## Format (example default; decide and record in an ADR)
| Item | Rule |
|---|---|
| Renditions | {{RENDITIONS}} (example: 1080p, 720p, 360p) |
| Segments | fMP4 (CMAF): `init.mp4` + `seg_NNNNN.m4s` per rung, target duration {{SEGMENT_SECONDS}} (example: 6 s) |
| Video | H.264 (AVC) **High Profile**; level limit per rung (PROPOSED); closed GOP; **IDR at every segment start**, keyframe interval chosen so a segment holds whole GOPs |
| Audio | AAC-LC stereo at a fixed bitrate per rung |
| Master playlist | `master.m3u8` with `CODECS`, `RESOLUTION`, `BANDWIDTH` and `AVERAGE-BANDWIDTH` per variant |
| Media playlists | `{rung}/index.m3u8`, `EXT-X-MAP` to `init.mp4`, **relative** segment URIs (a signer may rewrite each URI, see `playback-auth`) |
| Version | `ladder_version` stored per video; a new codec later = new version/variant set re-encoded from retained originals |
| Out of scope (example) | DRM, DASH, TS segments, per-title encoding |

Layout and write order (`master.m3u8` last) are in `r2-key-layout`.

## ffmpeg flags policy
- Flags come from the ladder contract, not from the container image or a worker.
- Same input + same `ladder_version` must give a functionally equal ladder; re-runs overwrite the same keys (idempotent, `cloudflare-containers-notes`).
- Aim for a fixed GOP grid with an IDR at every segment start (no scene-cut keyframes that break the grid); fix the exact flags with a spike on real originals.
- Probe the source first (`ffprobe` at transcode start is the last ingest verification layer) and fail the run on an unreadable or zero-duration source.

## Validation (eval-runner, dev; ffprobe flags are standard ffmpeg usage, confirm on your version)
```bash
# codec, profile, level, size per rung
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,level,width,height -of json v1080/init.mp4
# audio codec
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels,bit_rate -of json v1080/init.mp4
# keyframes land on segment starts: join init + one segment, first video packet must be a keyframe (flags start with K)
cat v1080/init.mp4 v1080/seg_00001.m4s > /tmp/s1.mp4
ffprobe -v error -select_streams v:0 -show_entries packet=pts_time,flags -of csv=p=0 /tmp/s1.mp4 | head -1
```
Checks: all rungs present; master has `CODECS`/`RESOLUTION`/`BANDWIDTH`; `EXT-X-TARGETDURATION` equals the segment length and segment durations are close to it (last segment may be shorter); segment count ≈ duration / segment length; every playlist URI resolves to an object; `master.m3u8` exists only after all rung playlists and segments (check `LastModified` order); the original in the source bucket is untouched; playback of ≥ 1 rendition in headless Chromium via hls.js.

## Players
hls.js where `Hls.isSupported()`, otherwise native `<video src=master.m3u8>` (Safari); put this as an integration note in {{CONTRACT_DIR}}. Check the minimum iOS/Safari/hls.js versions you support against current documentation. **Automation cannot cover Safari/iOS**: report it as NOT tested by automation and keep a manual real-device check before go-live.

## Do not
Change ladder, segment length or codec without a `ladder_version` bump and an ADR; write `master.m3u8` before the last segment; put absolute URLs or tokens in stored playlists (tokens are added per request by the signer).
