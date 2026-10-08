# Game Guide Book mockup — inputs needed (2026-10-08)

Status: BLOCKED. Gates G1-G7 = BLOCKED (no image exists). Spec: `prompts/owarin-design-latest.md` v1.1 (fat round soft lettering).

## Why blocked
1. The repo (all remote branches) contains no image files. Cover sources and references live only on the owner PC.
2. R1, R1b, R2, R2 crop and F1 are temp paths on the owner PC (`C:/Users/JIN/AppData/Local/Temp/codex-clipboard-*.png`, `C:/Users/JIN/Desktop/490223810_...jpg`); this cloud session cannot read them.
3. This session has no image-generation tool. Spec §4 step 8 allows a deterministic code-based composition (Pillow) only when the owner explicitly authorizes it.

## Files the owner must commit and push to branch `claude/amazing-fermi-epks6q`
Put them under `prompts/mockup-inputs/` (copy from the PC, do not move):
- `R1.png` (three-book layout reference)
- `R2.jpg` (label fade reference) and `R2-crop.png`
- clean cover images: Dragon Ball, Final Fantasy VI, Breath of Fire (the "same three selected editions"; from `C:\Users\JIN\OWARIN-DATA\All Products\...`)

## Decision needed (one question)
Compose with code (Pillow: ivory ground, real cover files placed per R1, taupe fade strip, text in a rounded heavy font) — YES / NO. Note: no rounded heavy Japanese font is installed here; a font file (e.g. a Maru Gothic style, license permitting) must also be committed to `prompts/mockup-inputs/fonts/`.

## One line to paste in the next session
Read prompts/game-guide-mockup-inputs-needed.md and prompts/owarin-design-latest.md on branch claude/amazing-fermi-epks6q, then build the Game Guide Book mockup from the committed inputs (code composition authorized: YES/NO).

## Update 2026-10-08 (after the first GPT run)
- GPT produced one mockup (1254x1254, not saved in the repo). Review against spec: G1 FAIL (size), G3 structure PASS, G4 FAIL (Japanese right-aligned), G5 FAIL (angular, Japanese too light), G6 FAIL (band almost equal to ivory), G2 PASS as mockup only (cover text is regenerated), G7 not checked. Recorded as F2 in the spec.
- Owner decision: lettering must be fat, round, soft and relaxed. Spec raised to v1.1 with the fixes above.
- Next step after the reset: owner commits the input files above, answers the code-composition YES/NO question, then one targeted correction per spec section 4. The PC copy of the spec (C:\Users\JIN\OWARIN-DATA\All Products\prompts\owarin-design-latest.md) is still v1.0 until the owner pastes v1.1 over it.
