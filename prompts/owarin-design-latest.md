# OWARIN Design Master v1.1 — 2026-10-08

Status: Latest specification and production workflow, derived from the owner's latest instructions and corrections. No design image is owner-approved by this document. No image generation is requested in this planning task.
v1.1 change (owner, 2026-10-08): lettering is now FAT, ROUND and SOFT with a relaxed feel; failures of the first GPT run (F2) are written into the gates. Everything else is unchanged from v1.0.
Authority: Later explicit owner instructions override this file. This file supersedes conflicting layout, typography and label guidance in the earlier v9-v12 briefs. Preserve earlier files as history.

## 1. Compact working card — read this first on every production turn

CURRENT CATEGORY: GAME GUIDE BOOK
FORMAT: 1080 x 1080 pixels, verified from the exported file.
GROUND: Warm ivory.
BOOKS: Dragon Ball left; Final Fantasy VI upper right; Breath of Fire lower right.
COMPOSITION: One prominent book on the left, two smaller books stacked vertically on the right, reproducing the purposeful balance and spacing of the owner's three-book reference. Upright covers and parallel edges; asymmetric composition. Do not turn this into a three-across row or diagonal scatter.
LABEL: One lower-right group: GAME GUIDE BOOK / ゲームガイドブック. The Japanese line is CENTERED under the English line (same center axis), not right-aligned or left-aligned.
TYPE: Fat, round, soft and relaxed in both languages: very thick chubby rounded sans-serif (Japanese maru-gothic feel), black/extra-bold weight, wide round counters, fully rounded corners and terminals, no sharp corners, slightly generous letter spacing. It must feel friendly and calm. A regular or geometric sans made bold is insufficient if any corner still looks sharp or any stroke looks thin.
BACKING: A horizontal translucent warm-taupe band, visibly different from the ivory ground, stronger beneath the right-side text and fading to transparency toward the left. Preserve the reference's directional transition; do not substitute an opaque rectangle, an ivory-on-ivory patch, or a radial glow.
EXTRAS: None. No brand block, Thai headline, CTA, vertical Japanese, borders, icons, ornaments, prices or claims.
DELIVERY: One reviewed mockup. Every mandatory gate must pass; otherwise record FAIL or BLOCKED honestly.

## 2. Reference roles — distinguish instructions, inspiration and rejected output

The reference images have separate jobs. Supplying them to a generator without these roles is insufficient.

| ID | Source | Allowed use |
| --- | --- | --- |
| R1 | C:/Users/JIN/AppData/Local/Temp/codex-clipboard-75bb6f4c-6f90-4e11-bb6c-b14f8aca4c5e.png | Primary three-book layout: one left, two vertically stacked right; relative scale, controlled spacing, upright edges and outer breathing room. |
| R1b | C:/Users/JIN/AppData/Local/Temp/codex-clipboard-7bfb8611-8675-47f2-91df-56ae89664a13.png | Supporting examples of intentionally arranged asymmetric book groups. Consult only if R1 leaves a geometric issue unresolved. |
| R2 | C:/Users/JIN/Desktop/490223810_1413075540029648_4095631090842734323_n.jpg | Lower-right horizontal fading label treatment; do not copy wooden vessels, wood background or Japanese store information. |
| R2 crop | C:/Users/JIN/AppData/Local/Temp/codex-clipboard-fcf06f90-21b8-4d38-809e-3239b20dcd36.png | Close inspection of the directional transition and label proportions. |
| F1 | C:/Users/JIN/AppData/Local/Temp/codex-clipboard-d0fb5ae3-4eb1-48cf-90a1-afb9875abe22.png | Rejected output crop shown for criticism. It is NOT an approved font specimen or positive visual master. |
| F2 | Owner chat 2026-10-08 (first GPT run of this spec; no saved path) | Rejected output. Layout (one left, two right) was acceptable. Failed: G1 (1254x1254, not 1080), G4 (Japanese right-aligned, not centered), G5 (letters bold but angular, Japanese too light), G6 (band tint almost equal to ivory: about 250,243,230 vs ground 250,247,242). Never use as a positive master. |

The owner has specified thick rounded typography verbally; no exact font family has been approved. Do not invent a font name or claim that a generated bitmap uses a particular installed font.

The temporary attachment paths above were supplied by the owner and were visible in chat. Their continued disk availability is not guaranteed. Before production, verify the required files once and copy accessible references into the project with their roles if useful. Do not claim missing files are recovered or copied without evidence. Follow the owner rule for committed PC evidence if a source must be supplied again.

## 3. Detailed visual specification

### Canvas and background
- Final export: square 1080 x 1080, PNG, with a visible ivory background.
- Keep the calm ivory direction and existing subtle natural shadows.
- Do not switch to the dark reference background or add new texture, props or decoration.
- A differently sized native generation may be used as an intermediate. It is not a completed 1080px deliverable.

### Book layout
- Use the same three selected guide editions for this mockup.
- Dragon Ball is the prominent left object. Final Fantasy VI is upper right. Breath of Fire is lower right.
- The left object is centered approximately against the height of the two-book group. The right books share a deliberate column and a clear vertical gutter.
- Reproduce the reference's balance, not just the abstract idea of three objects. Preserve breathing room around the group; do not enlarge the left book until the whole canvas feels packed.
- Each cover stays upright with its original aspect ratio. Never stretch books to create equal widths, heights or baselines.
- Keep book silhouettes separate and full edges visible. Reserve the label zone before scaling the books so the label never covers a product.
- Derive normalized bounding boxes and gaps from R1 once when implementing. Record the chosen values in the working file instead of reinterpreting the composition at every turn.
- This layout is for the current three-book category only. Other categories may use different counts and balanced arrangements when requested; do not force every category into three books.

### Label geometry and gradient
- One horizontal band in the lower-right area, with the right end anchored toward the canvas edge.
- Preserve a coherent strip shape and horizontal upper/lower boundaries. Fade along its length toward the left; do not blur every edge into a floating oval or glow.
- Use one muted warm taupe/gray-brown hue darker than the ivory ground. The owner explicitly corrected ivory-on-ivory backing because it disappeared.
- The left end blends into the underlying background; the text area has enough tint to read as an intentional band while some background character remains visible.
- Starting implementation suggestion, not an owner-approved color measurement: taupe near #AA9B89, alpha from 0 at the left to approximately 0.45-0.60 beneath the text. Adjust only tint strength and gradient stops if needed to match the reference's visible transition.
- No opaque box, hard left rectangle edge, outline, decorative border, label shadow or unrelated color.
- Compare a close crop of the result to R2, not just the full artwork. If the transition cannot be seen on ivory, this gate fails.

### Typography and exact text
- First line: GAME GUIDE BOOK
- Second line: ゲームガイドブック
- Both horizontal, with the Japanese centered beneath the English on the same center axis (not right-aligned).
- The Japanese line is smaller, but it retains thick rounded forms and adequate legibility.
- Feeling: fat, round, soft, relaxed, friendly. Think chubby marugothic lettering: broad heavy strokes, fully rounded corners and terminals, round counters, no sharp corners, no serif, no thin or high-contrast strokes.
- English line: heavy rounded sans, all caps, slightly generous letter spacing.
- Japanese line: same chubby rounded weight (not a light or medium gothic), smaller than the English line, same stroke feel.
- Font examples for the deterministic editor step only (not owner-approved, never claim a bitmap used one): Japanese Zen Maru Gothic Black or M PLUS Rounded 1c Black; English Nunito Black or Fredoka Bold. Ask the owner before installing or using any font.
- Alignment: the Japanese line is centered under the English line. Check that the two line centers differ by no more than 2% of the English line width.
- Do not accept a font solely because its weight setting says Bold. Inspect the visible letter shapes.
- Fit the two-line unit inside the readable part of the fade with comfortable padding.
- Dark charcoal text; no shadow, stroke outline or gradient fill inside the letters.
- No side text or additional copy. The current singular uppercase category label supersedes the earlier Game Guide Books heading for this card.

### Product integrity
- Preserve the three recognizable editions and title numerals; Final Fantasy VI means six.
- For layout mockups, check the recognizable edition, cover colors, broad design and aspect ratios.
- Generatively reconstructed fine print, artwork and condition are not verified product photography. A mockup passing layout review does not pass sales-fidelity review.
- For faithful sales use, use verified clean originals and a suitable authorized composition workflow.

## 4. Workflow — one writer, one compact checklist

1. Load the compact working card, the current owner correction, R1, R2 and the chosen book source. Do not reread all earlier versions or research new styles.
2. State the change internally in one line. Separate fixed requirements from the one property being revised. Record any owner change in this file before generating.
3. Run the preflight gate: correct reference roles, exact copy, current sources available, export path available, no contradictory old requirements. Treat rejected examples as failure examples.
4. Use the current built-in imagegen workflow for image requests, with explicit input roles. Start with one generation only. Ask for the exact format and constraints; avoid essays, strategy text and unrelated references.
5. Inspect the actual output against G1-G7 below. Do not infer compliance from prompt wording or the fact that an image exists.
6. If a visual gate fails, describe only that failure and perform one targeted edit while locking all passed elements. Recheck the changed region plus any book identity, layout or text that could have drifted.
7. If the same failure remains after the targeted edit, stop additional paid generation. Record the failing gate and choose a different controllable method when authorized rather than repeating the same vague prompt.
8. Exact font/gradient composition may require a deterministic editor. Do not silently substitute code-based image editing for the default imagegen route: use it when explicitly requested or authorized under the applicable tool rules. If needed, ask once for that method with the failed result and exact proposed correction ready.
9. Export 1080x1080 using an available permitted export workflow, then open the exported file. Check dimensions from metadata and inspect that file, not only the native preview.
10. Mark REVIEWED MOCKUP only when every mandatory gate passes. Save the prompt, references used, actual path/dimensions, generation/edit counts and short QA row. Preserve prior outputs.
11. Deliver one image with a short status. Owner approval and sales readiness remain separate statuses.

A tool may display an intermediate preview automatically. That does not mean it has passed review. Never label a failed preview as complete. If the filesystem/export tool fails, retain the generated original and report the blocked export accurately; do not keep generating images to fix a filesystem problem.

## 5. Mandatory acceptance gates

All gates use PASS / FAIL / BLOCKED. UNKNOWN is not PASS. No score averaging can hide a failed requirement.

| Gate | Evidence required | Fail examples |
| --- | --- | --- |
| G1 Format | Metadata from the final exported image says exactly 1080x1080; file opens. Read the real width and height; do not judge by eye. | Native 1254px described as final 1080px (happened in F2); unreadable or unsaved output. |
| G2 Products | Three intended books, correct main titles/VI, original cover aspect ratios and full silhouettes. | Wrong edition/numeral, missing book, stretched cover. |
| G3 Arrangement | Side-by-side inspection with R1 confirms one left and two right, upright edges, controlled gaps and comparable visual balance. | Three-across row, diagonal scatter, oversized crowded left book. |
| G4 Copy and grouping | Exactly the two specified lines, horizontal, one lower-right group; Japanese centered beneath English (line centers within 2% of the English width). | Japanese right- or left-aligned (happened in F2), vertical Japanese, extra headline/brand/CTA, wrong spelling or singular/plural. |
| G5 Letter shapes | Close crop of both languages confirms fat, round, soft forms: every corner and terminal rounded, heavy strokes in both languages, relaxed friendly feel, readable text. | Any sharp corner, thin or medium Japanese (happened in F2), regular or geometric sans merely bolded, malformed Japanese. |
| G6 Fade | Label crop confirms visible warm-taupe tint and smooth horizontal transition to transparent left, coherent strip proportions, legible dark type. Suggested pixel check: average colour behind the text is at least 25 RGB units darker than the ground at the same height on the far left, and the left end is within 5 units of the ground. | Ivory on ivory (happened in F2: about 5 units difference), opaque box, radial glow, almost invisible gradient. |
| G7 Full composition | Full-size and approximately 360px-wide review confirms book recognition, label readability, clear margins and no product-label overlap or extras. | Tiny covers, clipped letters, decoration, label over cover. |

Minimal QA record:
version | actual dimensions | G1 G2 G3 G4 G5 G6 G7 | changed gate | generation/edit count | saved path

Log owner corrections, tool failures and resolutions in C:/Users/JIN/OWARIN-DATA/All Products/_logs/INCIDENTS.csv. Keep entries short and factual. Do not log a successful fix or save unless observed.

## 6. Token and retry policy

- Read this working card and current references, not the whole conversation history.
- One writer. No agent fan-out, model council or new web research for an already-defined visual edit.
- One initial generation, then at most one targeted visual correction before changing method or reporting the precise blocker.
- Keep a short immutable constraint block and a one-line delta; do not rewrite the whole creative strategy.
- Save prompt and QA once. Reuse them on the next category with only the actual category/source/layout delta.
- Review full image and the label crop once; after a local edit, inspect the changed region and the invariants it could affect.
- Do not regenerate books to solve an export-size issue or re-explore colors while fixing typography.
- Do not claim token or subscription-quota savings without measured usage. Efficiency here means fewer repeated reads, generations and explanations.
- Never omit a failed gate to satisfy a token target.

## 7. Delivery and version discipline

Canonical intended file: C:/Users/JIN/OWARIN-DATA/All Products/prompts/owarin-design-latest.md
Repo copy: prompts/owarin-design-latest.md on branch claude/amazing-fermi-epks6q (the PC copy is authoritative only once verified on disk).
Design-spec version: 1.0. Keep this separate from historical image version numbers.
Next image number: choose the next unused version after inspecting actual output files. Several recent generated previews were not confirmed saved into the workspace; do not invent their saved names or approvals.
Image path pattern: C:/Users/JIN/OWARIN-DATA/All Products/output/owarin-game-guide-books-vNN/01-game-guide-book-MOCKUP-1080.png
Prompt/QA: save one short per-image brief referencing this master; do not duplicate the entire master.

Handoff: Latest direction is ivory, reference-led asymmetric book placement, chunky rounded two-line lower-right type, and a visibly contrasting horizontal taupe fade. All previous generated images remain unapproved candidates.

## 8. Compact production prompt

Create one 1080x1080 OWARIN mockup (final export exactly 1080 by 1080 pixels). Product input supplies only Dragon Ball, Final Fantasy VI and Breath of Fire. R1 supplies the precise arrangement: one prominent upright book left, two smaller upright books stacked right, controlled gaps and breathing room, original cover proportions. Warm ivory ground. R2 supplies the lower-right horizontal label strip: muted warm taupe (about #AA9B89, clearly darker than the ivory) stronger beneath text on the right, smoothly fading to transparency toward the left; visibly distinct from ivory, not an opaque box or radial glow. Exact horizontal text: GAME GUIDE BOOK; below it, centered on the same axis, ゲームガイドブック. Both in fat, round, soft, relaxed lettering: very thick chubby rounded sans-serif with fully rounded corners and terminals, no sharp corners; Japanese smaller but equally heavy. No other added text or decoration. Keep full covers and clear label separation. Preserve the specified editions; VI is six.

## 9. Paste-ready continuation

Read C:\Users\JIN\OWARIN-DATA\All Products\prompts\owarin-design-latest.md. Make one Game Guide Book mockup from its latest specification, using the assigned reference roles. Follow G1-G7 and report only observed results. Use one initial generation and at most one targeted correction before changing method. Deliver one reviewed 1080x1080 image with no extra design elements.
