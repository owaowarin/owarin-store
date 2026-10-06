# CAUTION strip · design revision

Preview revision: 11 September 2026. The original Label Tool and installed Apps Script are unchanged. The order-workflow prototype uses this revised asset.

| Position | English | Japanese |
|---|---|---|
| Vertical heading | CAUTION | 注意 |
| Umbrella | Keep dry | 水濡れ注意 |
| Opening | Open with care | 開封注意 |
| Bending | Do not bend | 折曲厳禁 |
| Handling | Handle with care | 取扱注意 |

The original COUTION spelling was incorrect. The original Japanese caption under Keep Dry, 折曲注意, referred to bending rather than water. English captions now consistently use sentence case without terminal periods.

The prototype footer has zero padding and a block image at width:100%; height:auto. This removes the white bands inside the footer without stretching the image independently in either direction. The artwork has its own black internal spacing. The 100 × 150 mm label retains its 3 mm outer paper margin; this is not borderless printing.

Files: caution-original.png is the unmodified extracted source; caution-v2.png is the revised image; caution-v2.webp is a lossless encoding with identical dimensions and decoded RGBA pixels. The image was visually checked for the five English and five Japanese labels. The layout and icons were regenerated as a design proposal, not a pixel-identical restoration.

Generation: built-in imagegen, text-localization edit, with caution-original.png as the edit target.

Prompt:

> Edit the attached OWARIN shipping-caution strip as a production graphic, not a photo or mockup. Preserve its black-and-white Japanese parcel-label aesthetic, four equal-width pictogram cards in one row, and narrow vertical caution bar on the left. Preserve the shapes and aspect ratios of each pictogram; no stretching. Correct all typography, clean legible exact lettering. Left vertical bar reads exactly 'CAUTION' (C A U T I O N, NOT COUTION) plus '注意'. Under the umbrella the English reads 'Keep dry' and Japanese '水濡れ注意'. Under the crossed-out blade English 'Open with care' and Japanese '開封注意'. Under crossed-out bending book English 'Do not bend' and Japanese '折曲厳禁'. Under hands holding box English 'Handle with care' and Japanese '取扱注意'. Sentence case for all four English captions, no terminal periods, match font size consistently. Make the four card top edges and their bottom caption areas align. Tight continuous rectangular black strip, no white external canvas/margins above or below the artwork, no shadow, no perspective. Remove excessive unused bottom black padding below captions, keep a small even internal breathing space at top and bottom. Broad landscape aspect close to original 3.34:1; all four cards remain the same size relative to one another. Keep every caption and icon fully visible, no cut-off text. Output only the finished strip image.
