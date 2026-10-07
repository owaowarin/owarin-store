# PLAN — OWA (OWARIN STORE) Meta Messenger ads, round 1

จัดทำ: 2026-09-25 (Friday) 18:30 Bangkok · planned by Opus 5.5 · executor: Sonnet · device shell down (Windows update 2026-09-08) → date from the `current_time` tool, not `Get-Date`
Status: **PLANNED — nothing created in Meta yet.** Data source: Meta Ads connector, live reads 2026-09-25 18:2x (no manual exports).

---

## 0. Status board

| Step | What | Who | Status |
|---|---|---|---|
| S0 | Pre-flight reads + owner decisions D1–D3 | Sonnet asks, owner answers | DONE 2026-10-07 (D1 ฿100×3, D2 album posts; D3 OPEN) |
| S1 | Owner publishes / picks 3 category posts | Owner | DONE 2026-10-07 (GAMEMAG SPECIAL / MEGA MONTH / GGB albums) |
| S2 | Create campaign + 3 ad sets + ads, all **PAUSED** | Sonnet | DONE 2026-10-07 as Ads Manager DRAFT, campaign 120248381934380018 |
| S3 | Read-back verify + preview links → owner approves | Sonnet + owner | WAITING owner "go" |
| S4 | Activate (only after owner says go) | Sonnet | TODO |
| S5 | Read results D+3 / D+7 / D+14, apply §6 rules | Sonnet | TODO |
| S6 | Close round: handoff + next-round proposal | Sonnet | TODO |

---

## 1. Hard rules for the executor (read first)

1. **Scope = ad account `764423867382929` (Shonen Star Studio) + Page `676297058896868` (OWA ― OWARIN's STORE) only.** Do not create, edit, pause or delete anything belonging to Shonen Star Studio (page 383315658691240) or Hiyoko (page 924776127386368). The currently ACTIVE campaign `02SEP2026 : SSS` (120247779992860018) is out of scope — leave it exactly as it is.
2. Never touch any other ad account (Chubbygirlbkk, Condo, Cube Pcg, OWA OWARIN, OWARIN STORE 1303881167728281).
3. Every object is created **PAUSED**. Activation (S4) needs the owner's explicit "go" in chat for that exact object. Spending money is the owner's call.
4. Create new objects; **never edit or re-activate old campaigns/ad sets** (owner rule: new beats editing). No mid-flight budget/targeting edits — a change = a new ad set.
5. Every create / status change → a row in the log CSV (§7). No log = step not done.
6. After every create, read the object back with `ads_get_ad_entities` (`object_ids`, correct `level`) and compare to this spec. Report any difference instead of "fixing" silently.
7. If a tool returns an error or the UI differs from this plan, stop and ask the owner; do not improvise settings.
8. Budgets in the Meta tools are in satang: **฿100 = `10000`**. Account minimum daily budget = `3351` (฿33.51).

---

## 2. What the data says (evidence for every setting below)

Scope of evidence: all OWA-page ad sets in act 764423867382929 created 2025-09-01 → 2026-09-02, lifetime to 2026-09-25. 28 ad sets, ฿25,283 spend, 425 messaging conversations, 155 Meta purchases.
Evidence files (live pulls 2026-09-25): `00 Docs/ads-evidence/` — `owa_adsets_20260925.csv` (§2.1/2.2/2.5), `owa_age_gender_20260925.csv` (§2.3), `owa_placement_20260925.csv` (§2.4), `owa_ads_creatives_20260925.csv` (§2.6, with post IDs), plus the two raw breakdown JSONs. Re-pull before reusing any figure after this date.
"Meta purchase" = purchase recorded in the Messenger chat and attributed by Meta (`onsite_conversion_purchase`). It is a Meta count, **not** the owner's confirmed order count (see §6.4).

### 2.1 Optimization goal — Conversations wins

| Performance goal | Ad sets | Spend ฿ | Convos | ฿/convo | Meta purchases | ฿/purchase |
|---|---|---|---|---|---|---|
| **CONVERSATIONS** (Engagement → Messenger) | 21 | 17,890 | 425 | 42.1 | 134 | **133.5** |
| MESSAGING_PURCHASE_CONVERSION ("Sales in chat") | 4 | 2,102 | – | – | 7 | 300.2 |
| POST_ENGAGEMENT | 2 | 5,152 | – | – | 13 | 396.3 |
| REACH | 1 | 140 | – | – | 1 | 140.0 |

→ Use **CONVERSATIONS** only. Do not use purchase-optimized, post-engagement or reach goals for OWA this round.

### 2.2 Audience (CONVERSATIONS ad sets only)

| Audience family | Ad sets | Spend ฿ | ฿/convo | Meta purchases | ฿/purchase |
|---|---|---|---|---|---|
| **Hobby / model** (Gundam, action figure, collectible toys) | 3 | 1,512 | 30.9 | 25 | **60.5** |
| **Retro / PlayStation / Nintendo / game magazines** | 4 | 3,162 | 37.2 | 30 | **105.4** |
| Console gamers (behavior) | 10 | 12,076 | 43.3 | 75 | 161.0 |
| Retargeting / lookalike (warm pools ≈1,000 people) | 3 | 427 | 106.6 | 1 | 426.5 |

Evidence strength: small counts (0–27 purchases per ad set) → directional, not proof. Console gamers carries most volume but costs ~2.6× more per purchase than hobby/model. Warm/lookalike pools are too small and cost the most → not used this round.

### 2.3 Age × gender (15 OWA campaigns, lifetime)

| Segment | Share of spend | ฿/convo | Share of purchases | ฿/purchase |
|---|---|---|---|---|
| Male 35–44 | 48.1% | 44.8 | 53.7% | 125.9 |
| Male 45–54 | 21.1% | 56.9 | 25.0% | **118.8** |
| Male 25–34 | 23.0% | 38.5 | 17.6% | 182.7 |
| All female | 4.8% | 76.1 | 2.2% (3) | 304.5 |

→ Men only. Core age 35–54; 25–34 men chat cheaply but buy less. Advantage+ audience must be **OFF** so age/gender are hard limits (with it ON Meta treats them as suggestions and spends on women).

### 2.4 Placement (same 15 campaigns)

Facebook Feed = 92.8% of spend and 130 of 136 purchases. Instagram got ฿16 and 0 results even where it was allowed. → **Facebook only** (Manual placements). Keep all Facebook positions, same as the best historical ad sets; delivery will concentrate in Feed by itself.

### 2.5 Budget level (CONVERSATIONS)

Historic budgets were mostly set at campaign level on campaigns with 1–2 ad sets, so the figure below is the parent campaign's daily budget.

| Campaign daily budget | Ad sets | ฿/purchase |
|---|---|---|
| ฿100 | 16 | **113.3** |
| ฿200 | 2 | 117.3 |
| ฿300 | 2 | 545.8 |
| ฿500 | 1 | 121.5 |

→ ฿100/day per ad set. Scale by adding ad sets / fresh posts, never by raising one ad set's budget (matches the owner's long-standing finding that aggressive scaling collapses results).

### 2.6 Creative

All OWA ads are existing Page posts (album posts with a price list), destination Messenger. Best ads by ฿/purchase: category stock-list posts — `owa-hobbymodel 15-04-2026` (฿126 → 5 purchases), `owa-ggb-11MAY2026` (฿218 → 5), `owa-gundam-11MAY2026` (฿179 → 3), `GGB - 27OCT2025` (฿536 → 8), `02SEP2026 : Album - GAMEMAG SPECIAL` (฿398 → 3).
Weak: the generic welcome post `OWA - Main Post + Catalouge` (฿889 → 3 purchases, ฿296/purchase) and single-title posts (Harvest Moon ฿94/convo).
→ Use **category-themed, in-stock-only album posts with prices**, one theme per audience. No generic "welcome" posts.

### 2.7 Corrections to the earlier chat summary (same day)

- Purchase tracking is **not** broken: OWA conversation ad sets recorded 134 Meta purchases. `02SEP2026 : SSS` showing "Not available" means zero purchases, not a tracking fault.
- The audience named `Engaged 240 days` (120247779615520018) is built on the **Hiyoko** page with a **180-day** window — do not use it for OWA.
- Hiyoko is a buying page (รับซื้อหนังสือ); its cheap chats are sellers, not buyers — not comparable with OWA. `KK - …` ad sets are Hiyoko posts.
- For OWA, console gamers is the volume audience, not the best one; hobby/model is.

---

## 3. Owner decisions (S0 — Sonnet asks with AskUserQuestion, records answers)

| ID | Question | Default if owner has no preference |
|---|---|---|
| D1 | Daily budget for this round | 3 ad sets × ฿100 = **฿300/day**, 14 days ≈ ฿4,200. Option B: 2 ad sets (A1+A2) = ฿200/day. |
| D2 | Which 3 posts to promote (§4.3) | Owner publishes fresh category posts listing only in-stock items. |
| D3 | Break-even cost per purchase (depends on margin) | Until given, use the historical benchmark ฿120 (§6). |

Record answers in `04 Design Tools/logs/decisions_<yyyymmdd>.csv` (same columns as existing decisions files) before S2. Before asking, read all `decisions_*.csv`; if any of D1–D3 is already CLOSED, do not ask again.

---

## 4. Build spec

### 4.1 Campaign

| Setting | Value |
|---|---|
| Name | `<DDMMMYYYY of creation> : sub-owa` (e.g. `26SEP2026 : sub-owa`) — owner's existing convention |
| Objective | `OUTCOME_ENGAGEMENT` (Ads Manager: **Engagement**) |
| Buying type | `AUCTION` |
| Budget mode | **ABO** — no campaign budget (Advantage campaign budget OFF), so each audience gets its own ฿100 and results stay comparable |
| Special ad categories | none (`[]`) |
| Status | PAUSED |

### 4.2 Ad sets (all three share the rows marked "common")

Common:

| Setting | Value |
|---|---|
| Conversion location / destination | Messaging apps → **Messenger** (`destination_type: MESSENGER`, `promoted_object: {"page_id":"676297058896868"}`) |
| Performance goal | **Maximize number of conversations** (`optimization_goal: CONVERSATIONS`) |
| Billing | `IMPRESSIONS` |
| Bid strategy | Highest volume / `LOWEST_COST_WITHOUT_CAP` (no cost cap) |
| Daily budget | ฿100 → `daily_budget: 10000` |
| Attribution | leave default (7-day click + 1-day view — same as all history) |
| Location | Thailand, `location_types: ["home","recent","frequently_in"]` |
| Gender | **Men** (`genders: [1]`) |
| Advantage+ audience | **OFF** → `targeting_automation: {"advantage_audience": 0}` |
| Placements | Manual → **Facebook only**: `publisher_platforms: ["facebook"]`, `facebook_positions: ["feed","instream_video","marketplace","story","search","facebook_reels","facebook_reels_overlay","profile_feed","notification"]`, `device_platforms: ["mobile","desktop"]` |
| Locales | copy `locales` verbatim from the reference ad set (history uses `[35]`); do not change |
| Status | PAUSED |

Per ad set:

| # | Ad set name | Age | Detailed targeting (IDs verified from live reference ad sets) | Reference ad set to mirror |
|---|---|---|---|---|
| **A1** | `owa-hobbymodel-<DDMMMYYYY>` | 30–54 | Interests (OR): Gundam `6003137062700`, action figure (toys) `6003249416275`, Collectible toys (toys) `6808201392149` | `owa-hobby model` 120240521306570018 (฿46.9/purchase) |
| **A2** | `owa-retro-<DDMMMYYYY>` | 30–54 | Group 1 (OR): nintendo `6002943117046`, PlayStation `6003196423072`, Video game magazines `6830030522924` **AND** Group 2: Retrogaming `6003715920062` (two `flexible_spec` entries = narrow) | `owa-retrogaming` 120240126787570018 (฿95/purchase) |
| **A3** | `owa-console-<DDMMMYYYY>` | 35–54 | Behavior: Console gamers `6007847947183` | `owa-main-11MAY2026` 120242459933670018 (฿51/purchase) — tighten to men 35–54 per §2.3 |

If D1 = option B, build A1 + A2 only.

Example `targeting` JSON for A1 (A2/A3 differ only in `age_min`/`age_max` and `flexible_spec`):

```json
{
  "geo_locations": {"countries": ["TH"], "location_types": ["home","recent","frequently_in"]},
  "genders": [1],
  "age_min": 30,
  "age_max": 54,
  "flexible_spec": [{"interests": [
    {"id": "6003137062700", "name": "Gundam"},
    {"id": "6003249416275", "name": "action figure (toys)"},
    {"id": "6808201392149", "name": "Collectible toys (toys)"}]}],
  "publisher_platforms": ["facebook"],
  "facebook_positions": ["feed","instream_video","marketplace","story","search","facebook_reels","facebook_reels_overlay","profile_feed","notification"],
  "device_platforms": ["mobile","desktop"],
  "locales": [35],
  "targeting_automation": {"advantage_audience": 0}
}
```

A2 `flexible_spec`: `[{"interests":[{"id":"6002943117046","name":"nintendo (game consoles and accessories)"},{"id":"6003196423072","name":"PlayStation (game console)"},{"id":"6830030522924","name":"Video game magazines (publication)"}]},{"interests":[{"id":"6003715920062","name":"Retrogaming"}]}]`
A3 `flexible_spec`: `[{"behaviors":[{"id":"6007847947183","name":"Console gamers"}]}]`, `age_min` 35.

Before S2, re-read the reference ad set's `targeting` live and confirm the IDs above still resolve (Meta retires interests). If one is gone, stop and ask.

### 4.3 Ads (creatives)

| Ad set | Post theme (owner provides, D2) | Ad name |
|---|---|---|
| A1 | 【MAGAZINE — GUNDAM / HOBBY MODEL】 in-stock list with prices | `owa-hobbymodel-post-<DDMMMYYYY>` |
| A2 | Retro game magazines / GAMEMAG / PS–Nintendo era guide books in-stock list | `owa-retro-post-<DDMMMYYYY>` |
| A3 | 【GAME GUIDE BOOKS】 in-stock update list | `owa-ggb-post-<DDMMMYYYY>` |

Rules: 1 ad per ad set (max 2 if the owner gives two posts of the same theme). Post published ≤7 days before launch, lists only items that are Instock in the sheet. Keep the post's shipping line (฿50 first book, +฿10 each, max ฿100; no COD) — it filters low-intent chats.

Creative = the existing post, nothing else: `creative: {"object_story_id": "676297058896868_<post_id>"}`. No extra text, CTA, link or Advantage+ creative. If the owner can only give a `pfbid…` link (no numeric post ID), do the ad step in Ads Manager via Path B ("Use existing post" picker) instead.

After creating each ad, call `ads_get_ad_preview` with the ad ID and give the owner the `preview_url`.

---

## 5. Execution steps

### Path A — Meta Ads connector (primary)

1. `ads_get_ad_accounts` → confirm 764423867382929 is ACTIVE, `is_queryable: true`.
2. `ads_get_ad_entities` level=adset, `object_ids` = the three reference ad sets, `fields: ["name","targeting"]` → confirm interest/behavior IDs (§4.2).
3. `ads_create_campaign`: `ad_account_id 764423867382929`, `campaign_name` per §4.1, `objective OUTCOME_ENGAGEMENT`, `buying_type AUCTION`, `special_ad_categories "[]"`; **no** `campaign_daily_budget` / `campaign_bid_strategy` (ABO). Read back. Log.
4. For A1, A2, A3: `ads_create_ad_set` with `campaign_id`, `ad_set_name`, `billing_event IMPRESSIONS`, `optimization_goal CONVERSATIONS`, `destination_type MESSENGER`, `promoted_object {"page_id":"676297058896868"}`, `daily_budget 10000`, `bid_strategy LOWEST_COST_WITHOUT_CAP`, `targeting` per §4.2. Read back `targeting`, `optimization_goal`, `destination_type`, `daily_budget`, `effective_status`. Check `targeting_automation.advantage_audience` = 0 and `genders` = [1] in the read-back. Log.
5. For each ad set: `ads_create_ad` with `ad_set_id`, `ad_name`, `creative {"object_story_id":"676297058896868_<post_id>"}`. Read back. `ads_get_ad_preview` → send links. Log.
6. Stop. Show the owner a table (object, ID, key settings, preview link). Wait for "go".
7. On "go": `ads_activate_entity` (load via ToolSearch) for campaign → ad sets → ads the owner approved. Read back `effective_status` = ACTIVE (or IN_PROCESS / PENDING_REVIEW). Log.

### Path B — Ads Manager clicks (fallback, or for the ad step with a pfbid link)

Open Ads Manager for act 764423867382929. Labels can shift slightly between Meta UI versions — match by meaning and stop if a setting below does not exist.

1. **+ Create** → **Engagement** → **Continue**. Campaign name per §4.1. **Advantage campaign budget**: OFF. Special ad categories: none.
2. Ad set: **Conversion location** = **Messaging apps** → tick **Messenger** only. **Performance goal** = **Maximize number of conversations**. Page = **OWA ― OWARIN's STORE**.
3. **Budget & schedule**: Daily budget **฿100**; start = today; no end date.
4. **Audience**: click **Switch to original audience options** (Advantage+ audience OFF). **Locations** = Thailand. **Age** = per §4.2 (A1/A2 30–54, A3 35–54). **Gender** = **Men**. **Detailed targeting** → type each interest name from §4.2; for A2 add Retrogaming via **Narrow audience / Define further**.
5. **Placements**: **Manual placements** → **Platforms**: tick **Facebook** only (untick Instagram, Audience Network, Messenger, Threads). Leave all Facebook positions ticked.
6. Ad: name per §4.3 → **Ad setup** = **Use existing post** → **Select post** → pick the owner's post for that theme. Leave message template as default. Do not add text or change CTA.
7. **Publish** is spending money: instead, set the campaign toggle **OFF** first, publish, then wait for the owner's "go" to switch it on.

---

## 6. Reading results and rules (S5)

Day 0 = activation day. Read at D+3, D+7, D+14 with `ads_get_ad_entities` level=adset, fields `amount_spent, impressions, reach, frequency, ctr, results, cost_per_result, onsite_conversion_purchase`, `time_range` = Day 0 → today.

### 6.1 Targets (from history, §2)

| KPI | Target | Stop signal |
|---|---|---|
| Cost per messaging conversation | ≤ ฿40 | > ฿80 at D+7 |
| Cost per Meta purchase | ≤ ฿120 (or owner's D3 break-even) | > ฿240 at D+14 |
| Frequency | ≤ 2.5 | > 3.0 |

### 6.2 Actions

- **D+0 → D+3:** no edits (learning).
- **Any time:** an ad set spends ≥ ฿300 with 0 conversations → propose pausing that ad set to the owner.
- **D+7:** cost/conversation > ฿80 → propose pausing that ad set. Otherwise leave it.
- **D+14:** end of round. Report per ad set vs §6.1. Winners (≤ targets) → next round gets a **new** campaign with the same audience and a fresh post. Losers → skip next round.
- **Frequency > 3.0** → the post is worn out: propose a new ad with a newer post (new ad, old ad paused).
- **Never** raise a running ad set's budget. To spend more on a winner, add a second ad set with the same audience + a different post.
- **Retiring an audience for good** requires ≥ 30 days of cumulative data across rounds (owner rule: no kill/keep decisions on < 30 days). Pausing within a round is not retiring.

Every pause / activate / new ad is proposed first and done only after the owner agrees (rule 1.3).

### 6.3 Cadence

New stock arrives 2–3× a month around Shopee mega-sale days. Each new category post = the trigger for the next round (new campaign, same spec). Next likely trigger: the 10.10 restock.

### 6.4 Measurement gap

Meta purchases are Meta's count. At D+14 ask the owner for the number of OWA orders closed in Messenger during the round and report both side by side. Do not add Meta purchases to Shopee GMV.

---

## 7. Logging (required)

File: `04 Design Tools/logs/meta_ads_owa_<yyyymmdd>.csv`, one new file per working day (the device shell cannot append; build the CSV in the workspace and write it with `device_commit_files` — never overwrite an existing log, use a new suffix `_2`, `_3` if the name exists).

Columns: `timestamp_bkk, step, action, object_level, object_id, object_name, field, before, after, source_ref, result`

- `action`: CREATE / ACTIVATE / PAUSE / READ-CHECK
- `before` for a CREATE = `(none)`; `after` = the key settings as created
- `source_ref` = this plan's section (e.g. `PLAN-OWA-META-ADS_2026-09-25 §4.2 A1`)
- `result` = OK / MISMATCH:<what> / ERROR:<message>

At the end of each working session append a section to `00 Docs/HANDOFF_<yyyymmdd>.md` (IDs created, statuses, open items) and update the status board (§0) of this file.

---

## 8. Not in this round (and why)

- **Purchase-optimized ("Sales in chat") ad sets** — ฿300/purchase vs ฿133.5 with conversations (§2.1).
- **Retargeting / lookalikes** — pools ≈1,000; ฿426/purchase (§2.2).
- **Instagram placements** — ~0 delivery and 0 results historically (§2.4).
- **Catalog (Advantage+ catalog) ads** — catalog 1993212747992458 is healthy (1,342 items) but OWA sells in chat, not on a website/shop checkout; revisit only if a shop destination is set up.
- **SSS and Hiyoko** — separate pages, separate plans.

---

## 9. Sonnet start prompt

> Read `00 Docs/PLAN-OWA-META-ADS_2026-09-25.md` fully, then all `04 Design Tools/logs/decisions_*.csv`. Execute §0 from the first TODO step. Obey §1 without exception. Ask the owner D1–D3 with AskUserQuestion if not already CLOSED. Build everything PAUSED, verify by read-back, log every action per §7, and stop for the owner's "go" before activating. Update the §0 status board and the day's HANDOFF when you finish.
